-- 002_workspaces.sql — Phase 2 Task 1: workspace model upgrade
--
-- Upgrade script for a LIVE database on the legacy schema
-- (profiles / categories / expenses / budgets, user_id-scoped RLS).
--
-- BEFORE RUNNING:
--   1. Back up the database (pg_dump or dashboard export).
--   2. Rehearse on a staging project seeded with the current schema.sql.
--
-- Runs as ONE transaction: any failure rolls the whole migration back.
-- This script is one-shot (renames are not idempotent) — do not re-run
-- after a successful commit.

begin;

--------------------------------------------------------------------------
-- 0. Safety net: ensure Phase 1 income support exists.
--    No-op on a database where the `type` column was already added.
--------------------------------------------------------------------------

alter table public.expenses
  add column if not exists type text not null default 'expense'
  check (type in ('expense', 'income'));

--------------------------------------------------------------------------
-- 1a. Workspaces + membership
--------------------------------------------------------------------------

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null default 'personal' check (type in ('personal', 'team')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','admin','member','viewer')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create index if not exists workspace_members_user_idx
  on public.workspace_members (user_id);

-- Security definer helpers: REQUIRED to avoid recursive RLS on workspace_members
create or replace function public.is_member(ws uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from workspace_members
    where workspace_id = ws and user_id = auth.uid()
  );
$$;

create or replace function public.has_role(ws uuid, roles text[])
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from workspace_members
    where workspace_id = ws and user_id = auth.uid() and role = any(roles)
  );
$$;

-- Creator automatically becomes owner
create or replace function public.handle_new_workspace()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  insert into workspace_members (workspace_id, user_id, role)
  values (new.id, new.created_by, 'owner')
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_workspace_created on public.workspaces;
create trigger on_workspace_created
after insert on public.workspaces
for each row execute function public.handle_new_workspace();

-- Auto-create a personal workspace for NEW users (profile creation path)
create or replace function public.handle_new_profile()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  insert into workspaces (name, type, created_by)
  select coalesce(nullif(new.full_name, ''), 'Personal'), 'personal', new.id
  where not exists (
    select 1 from workspaces w
    where w.created_by = new.id and w.type = 'personal'
  );
  return new;
end;
$$;

drop trigger if exists on_profile_created on public.profiles;
create trigger on_profile_created
after insert on public.profiles
for each row execute function public.handle_new_profile();

-- Keep updated_at fresh on the new tables
drop trigger if exists set_workspaces_updated_at on public.workspaces;
create trigger set_workspaces_updated_at
before update on public.workspaces
for each row execute function public.set_updated_at();

--------------------------------------------------------------------------
-- 1b. Backfill: one personal workspace per existing user
--     (on_workspace_created creates the owner membership rows)
--------------------------------------------------------------------------

insert into public.workspaces (name, type, created_by)
select coalesce(nullif(p.full_name, ''), 'Personal'), 'personal', p.id
from public.profiles p
where not exists (
  select 1 from public.workspaces w
  where w.created_by = p.id and w.type = 'personal'
);

--------------------------------------------------------------------------
-- 1c. Categories → workspace-scoped with stable IDs
--------------------------------------------------------------------------

alter table public.categories
  add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;

update public.categories c
set workspace_id = w.id
from public.workspaces w
where w.created_by = c.user_id and w.type = 'personal'
  and c.workspace_id is null;

alter table public.categories alter column workspace_id set not null;
alter table public.categories rename column user_id to created_by;
alter table public.categories drop constraint if exists categories_user_id_name_key;
create unique index if not exists categories_ws_name_key
  on public.categories (workspace_id, name);

--------------------------------------------------------------------------
-- 1d. Expenses → transactions with category FK
--------------------------------------------------------------------------

alter table public.expenses rename to transactions;
alter table public.transactions rename column user_id to created_by;
alter table public.transactions
  add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade,
  add column if not exists category_id uuid references public.categories(id);

update public.transactions t
set workspace_id = w.id
from public.workspaces w
where w.created_by = t.created_by and w.type = 'personal'
  and t.workspace_id is null;

alter table public.transactions alter column workspace_id set not null;

-- Create any category rows missing for free-text names, then link
insert into public.categories (workspace_id, created_by, name)
select distinct t.workspace_id, t.created_by, t.category
from public.transactions t
where t.category_id is null
on conflict do nothing;

update public.transactions t
set category_id = c.id
from public.categories c
where c.workspace_id = t.workspace_id
  and c.name = t.category
  and t.category_id is null;

alter table public.transactions alter column category_id set not null;
-- Keep the legacy `category` text column for now (deprecated); drop in a later
-- migration after production verification. The app stops writing it, so it
-- must allow nulls for new rows.
alter table public.transactions alter column category drop not null;

create index if not exists transactions_ws_date_idx
  on public.transactions (workspace_id, date desc);

--------------------------------------------------------------------------
-- 1e. Monthly budgets
--------------------------------------------------------------------------

create table if not exists public.budgets_monthly (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  month date not null check (date_trunc('month', month) = month),
  amount numeric(12,2) not null check (amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, category_id, month)
);

drop trigger if exists set_budgets_monthly_updated_at on public.budgets_monthly;
create trigger set_budgets_monthly_updated_at
before update on public.budgets_monthly
for each row execute function public.set_updated_at();

-- Seed current month from legacy single-limit budgets
insert into public.budgets_monthly (workspace_id, category_id, month, amount)
select w.id, c.id, date_trunc('month', now())::date, b.amount
from public.budgets b
join public.workspaces w on w.created_by = b.user_id and w.type = 'personal'
join public.categories c on c.workspace_id = w.id and c.name = b.category
on conflict do nothing;
-- Keep legacy `budgets` table (deprecated); drop later.

--------------------------------------------------------------------------
-- 1f. RLS rewrite
--------------------------------------------------------------------------

-- Drop old user_id-based policies (expenses policies moved with the rename)
drop policy if exists "Categories are readable by owner" on public.categories;
drop policy if exists "Categories are insertable by owner" on public.categories;
drop policy if exists "Categories are updatable by owner" on public.categories;
drop policy if exists "Categories are deletable by owner" on public.categories;

drop policy if exists "Expenses are readable by owner" on public.transactions;
drop policy if exists "Expenses are insertable by owner" on public.transactions;
drop policy if exists "Expenses are updatable by owner" on public.transactions;
drop policy if exists "Expenses are deletable by owner" on public.transactions;

drop policy if exists "Budgets are readable by owner" on public.budgets;
drop policy if exists "Budgets are insertable by owner" on public.budgets;
drop policy if exists "Budgets are updatable by owner" on public.budgets;
drop policy if exists "Budgets are deletable by owner" on public.budgets;

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.budgets_monthly enable row level security;

-- workspaces
drop policy if exists "workspaces: members read" on public.workspaces;
create policy "workspaces: members read" on public.workspaces
  for select using (public.is_member(id));
drop policy if exists "workspaces: authed create" on public.workspaces;
create policy "workspaces: authed create" on public.workspaces
  for insert with check (created_by = auth.uid());
drop policy if exists "workspaces: admins update" on public.workspaces;
create policy "workspaces: admins update" on public.workspaces
  for update using (public.has_role(id, array['owner','admin']))
  with check (public.has_role(id, array['owner','admin']));
drop policy if exists "workspaces: owner delete" on public.workspaces;
create policy "workspaces: owner delete" on public.workspaces
  for delete using (public.has_role(id, array['owner']));

-- workspace_members
drop policy if exists "members: members read" on public.workspace_members;
create policy "members: members read" on public.workspace_members
  for select using (public.is_member(workspace_id));
drop policy if exists "members: admins manage" on public.workspace_members;
create policy "members: admins manage" on public.workspace_members
  for insert with check (public.has_role(workspace_id, array['owner','admin']));
drop policy if exists "members: admins update" on public.workspace_members;
create policy "members: admins update" on public.workspace_members
  for update using (public.has_role(workspace_id, array['owner','admin']))
  with check (public.has_role(workspace_id, array['owner','admin']));
drop policy if exists "members: admins remove or self leave" on public.workspace_members;
create policy "members: admins remove or self leave" on public.workspace_members
  for delete using (
    public.has_role(workspace_id, array['owner','admin']) or user_id = auth.uid()
  );

-- categories
drop policy if exists "categories: members read" on public.categories;
create policy "categories: members read" on public.categories
  for select using (public.is_member(workspace_id));
drop policy if exists "categories: contributors insert" on public.categories;
create policy "categories: contributors insert" on public.categories
  for insert with check (public.has_role(workspace_id, array['owner','admin','member']));
drop policy if exists "categories: admins update" on public.categories;
create policy "categories: admins update" on public.categories
  for update using (public.has_role(workspace_id, array['owner','admin']))
  with check (public.has_role(workspace_id, array['owner','admin']));
drop policy if exists "categories: admins delete" on public.categories;
create policy "categories: admins delete" on public.categories
  for delete using (public.has_role(workspace_id, array['owner','admin']));

-- transactions
drop policy if exists "tx: members read" on public.transactions;
create policy "tx: members read" on public.transactions
  for select using (public.is_member(workspace_id));
drop policy if exists "tx: contributors insert" on public.transactions;
create policy "tx: contributors insert" on public.transactions
  for insert with check (
    public.has_role(workspace_id, array['owner','admin','member'])
    and created_by = auth.uid()
  );
drop policy if exists "tx: own or admin update" on public.transactions;
create policy "tx: own or admin update" on public.transactions
  for update using (
    public.has_role(workspace_id, array['owner','admin'])
    or (created_by = auth.uid() and public.has_role(workspace_id, array['member']))
  ) with check (public.is_member(workspace_id));
drop policy if exists "tx: own or admin delete" on public.transactions;
create policy "tx: own or admin delete" on public.transactions
  for delete using (
    public.has_role(workspace_id, array['owner','admin'])
    or (created_by = auth.uid() and public.has_role(workspace_id, array['member']))
  );

-- budgets_monthly
drop policy if exists "budgets: members read" on public.budgets_monthly;
create policy "budgets: members read" on public.budgets_monthly
  for select using (public.is_member(workspace_id));
drop policy if exists "budgets: admins write" on public.budgets_monthly;
create policy "budgets: admins write" on public.budgets_monthly
  for insert with check (public.has_role(workspace_id, array['owner','admin']));
drop policy if exists "budgets: admins update" on public.budgets_monthly;
create policy "budgets: admins update" on public.budgets_monthly
  for update using (public.has_role(workspace_id, array['owner','admin']))
  with check (public.has_role(workspace_id, array['owner','admin']));
drop policy if exists "budgets: admins delete" on public.budgets_monthly;
create policy "budgets: admins delete" on public.budgets_monthly
  for delete using (public.has_role(workspace_id, array['owner','admin']));

commit;

--------------------------------------------------------------------------
-- Post-migration sanity checks (run manually, expect no rows / zero counts)
--------------------------------------------------------------------------
-- select count(*) from public.transactions where category_id is null;
-- select count(*) from public.transactions where workspace_id is null;
-- select count(*) from public.categories where workspace_id is null;
-- select p.id from public.profiles p
--   left join public.workspaces w on w.created_by = p.id and w.type = 'personal'
--   where w.id is null;
