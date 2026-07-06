# Phase 2 — Workspace Model + Product Hardening

Goal: one schema overhaul that makes the app multi-workspace (personal + team) with proper referential integrity, monthly budgets, and verified RLS. Execute tasks in order. Run `npm run build` after each task. The live database migration (Task 1) must be rehearsed on a staging Supabase project before touching production, and production must be backed up first.

**Default permission model (implement as specified):** members create transactions and edit/delete only their own; admins/owners edit/delete anything and manage budgets/categories; viewers read-only.

---

## Task 1 — Schema overhaul (migration + fresh-install schema)

Create `supabase/migrations/002_workspaces.sql` (upgrade script for the live DB, wrapped in `begin; ... commit;`) AND rewrite `supabase/schema.sql` so a fresh project lands directly on the new model. The migration below is the target — verify each step on staging.

### 1a. Workspaces + membership

```sql
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
```

### 1b. Backfill: one personal workspace per existing user

```sql
insert into public.workspaces (name, type, created_by)
select coalesce(nullif(p.full_name, ''), 'Personal'), 'personal', p.id
from public.profiles p
where not exists (
  select 1 from public.workspaces w
  where w.created_by = p.id and w.type = 'personal'
);
```

(The trigger creates the owner membership rows.)

### 1c. Categories → workspace-scoped with stable IDs

```sql
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
```

### 1d. Expenses → transactions with category FK

```sql
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
-- migration after production verification.

create index if not exists transactions_ws_date_idx
  on public.transactions (workspace_id, date desc);
```

### 1e. Monthly budgets

```sql
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

-- Seed current month from legacy single-limit budgets
insert into public.budgets_monthly (workspace_id, category_id, month, amount)
select w.id, c.id, date_trunc('month', now())::date, b.amount
from public.budgets b
join public.workspaces w on w.created_by = b.user_id and w.type = 'personal'
join public.categories c on c.workspace_id = w.id and c.name = b.category
on conflict do nothing;
-- Keep legacy `budgets` table (deprecated); drop later.
```

### 1f. RLS rewrite (drop all old `user_id`-based policies on categories/transactions/budgets, then)

```sql
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.budgets_monthly enable row level security;

-- workspaces
create policy "workspaces: members read" on public.workspaces
  for select using (public.is_member(id));
create policy "workspaces: authed create" on public.workspaces
  for insert with check (created_by = auth.uid());
create policy "workspaces: admins update" on public.workspaces
  for update using (public.has_role(id, array['owner','admin']))
  with check (public.has_role(id, array['owner','admin']));
create policy "workspaces: owner delete" on public.workspaces
  for delete using (public.has_role(id, array['owner']));

-- workspace_members
create policy "members: members read" on public.workspace_members
  for select using (public.is_member(workspace_id));
create policy "members: admins manage" on public.workspace_members
  for insert with check (public.has_role(workspace_id, array['owner','admin']));
create policy "members: admins update" on public.workspace_members
  for update using (public.has_role(workspace_id, array['owner','admin']))
  with check (public.has_role(workspace_id, array['owner','admin']));
create policy "members: admins remove or self leave" on public.workspace_members
  for delete using (
    public.has_role(workspace_id, array['owner','admin']) or user_id = auth.uid()
  );

-- categories
create policy "categories: members read" on public.categories
  for select using (public.is_member(workspace_id));
create policy "categories: admins write" on public.categories
  for insert with check (public.has_role(workspace_id, array['owner','admin','member']));
create policy "categories: admins update" on public.categories
  for update using (public.has_role(workspace_id, array['owner','admin']))
  with check (public.has_role(workspace_id, array['owner','admin']));
create policy "categories: admins delete" on public.categories
  for delete using (public.has_role(workspace_id, array['owner','admin']));

-- transactions
create policy "tx: members read" on public.transactions
  for select using (public.is_member(workspace_id));
create policy "tx: contributors insert" on public.transactions
  for insert with check (
    public.has_role(workspace_id, array['owner','admin','member'])
    and created_by = auth.uid()
  );
create policy "tx: own or admin update" on public.transactions
  for update using (
    public.has_role(workspace_id, array['owner','admin'])
    or (created_by = auth.uid() and public.has_role(workspace_id, array['member']))
  ) with check (public.is_member(workspace_id));
create policy "tx: own or admin delete" on public.transactions
  for delete using (
    public.has_role(workspace_id, array['owner','admin'])
    or (created_by = auth.uid() and public.has_role(workspace_id, array['member']))
  );

-- budgets_monthly
create policy "budgets: members read" on public.budgets_monthly
  for select using (public.is_member(workspace_id));
create policy "budgets: admins write" on public.budgets_monthly
  for insert with check (public.has_role(workspace_id, array['owner','admin']));
create policy "budgets: admins update" on public.budgets_monthly
  for update using (public.has_role(workspace_id, array['owner','admin']))
  with check (public.has_role(workspace_id, array['owner','admin']));
create policy "budgets: admins delete" on public.budgets_monthly
  for delete using (public.has_role(workspace_id, array['owner','admin']));
```

Also: a trigger or app-side logic must auto-create a personal workspace for NEW users (extend the existing profile-creation path).

## Task 2 — RLS verification script
Create `scripts/rls-check.mjs` (run with `node scripts/rls-check.mjs`, reads `.env.test` with two seeded test-user credentials on staging). Assertions, using two separate anon-key Supabase clients signed in as user A and user B:
1. B cannot select A's personal-workspace transactions, categories, or budgets (0 rows, no error leaks).
2. B cannot insert a transaction into A's workspace (RLS violation expected).
3. In a shared team workspace where B is `viewer`, B can read but insert fails.
4. In the same workspace where B is `member`, B can insert, can update own transaction, cannot update A's transaction.
5. B (member) cannot upsert budgets; A (owner) can.
Exit non-zero on any failure. This script is the gate for Task 1 — no frontend work until it passes on staging.

## Task 3 — Frontend: workspace awareness
- New `src/services/workspaceService.js` (list my workspaces, create team workspace, get members) and `src/store/workspace.js` (workspaces, activeWorkspaceId persisted to localStorage, active role getter).
- Workspace switcher in `AppNav.vue` + "New team workspace" modal (name only).
- Rename `expenseService.js` → `transactionService.js`; all data services take `workspaceId`. Include `type`, `category_id`, `created_by` in selects; join category name (`categories(name)`) for display.
- `store/expenses.js` → `store/transactions.js`, scoped to the active workspace; reload data on workspace switch. Show "added by" on transaction rows when the active workspace is type `team`.
- Category management view: add/rename (safe now — FK), delete only when unused (or block with a clear message).
- Role-aware UI: hide budget/category editing from members, hide all write actions from viewers. UI hiding is convenience only — RLS is the enforcement.

## Task 4 — Frontend: monthly budgets
- BudgetPlanner gains a month picker (defaults to current month) and a "Copy from previous month" action.
- Budget progress computes strictly: selected month × expense-type transactions × workspace.
- Reports: month-over-month budget vs actual per category.

## Task 5 — Incremental TypeScript (services + stores only)
- Add `typescript`, `vue-tsc`; `tsconfig.json` with `allowJs: true`, `checkJs: false`.
- Convert `src/services/*` and `src/store/*` to `.ts` with explicit types for Workspace, Member, Transaction, Category, Budget rows (DB shape) and normalized app shapes.
- Add `npm run typecheck` (`vue-tsc --noEmit`); it must pass. Views/components stay `.vue` JS for now.

## Task 6 — CSV export + import
- Export: current filtered transactions of the active workspace to CSV (date, description, category, type, amount, added_by).
- Import: CSV upload → column mapping preview → validation report → batch insert (unknown categories auto-created, member-role permitted). Cap batches (e.g., 500 rows/insert).

---

## Execution order & safety rails
1. Back up production (pg_dump or dashboard export). Non-negotiable.
2. Create a staging Supabase project, run current `schema.sql` + seed sample data, then run `002_workspaces.sql` there.
3. Run `scripts/rls-check.mjs` against staging. Fix until green.
4. Build frontend Tasks 3–6 against staging.
5. Apply migration to production, flip env vars, verify, deploy.
6. Follow-up migration (later): drop `transactions.category` text column and legacy `budgets` table once production has run clean for a week.

## Acceptance criteria
1. Fresh project on new `schema.sql` and upgraded legacy project behave identically.
2. `rls-check.mjs` passes on staging and production.
3. Existing personal data is intact post-migration: same transaction count, amounts, dates; every transaction has a valid `category_id`.
4. A second real user added to a team workspace (manual SQL insert into `workspace_members` for now — invitations are Phase 3) can see and add shared transactions per their role.
5. Budgets are per-month; switching months switches limits and progress.
6. `npm run build` and `npm run typecheck` pass.
