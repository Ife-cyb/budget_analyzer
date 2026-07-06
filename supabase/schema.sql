create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  currency text not null default 'USD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  description text not null,
  category text not null,
  amount numeric(12, 2) not null check (amount > 0),
  date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  category text not null,
  amount numeric(12, 2) not null check (amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_expenses_updated_at on public.expenses;
create trigger set_expenses_updated_at
before update on public.expenses
for each row execute function public.set_updated_at();

drop trigger if exists set_budgets_updated_at on public.budgets;
create trigger set_budgets_updated_at
before update on public.budgets
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.expenses enable row level security;
alter table public.budgets enable row level security;

drop policy if exists "Profiles are readable by owner" on public.profiles;
create policy "Profiles are readable by owner"
on public.profiles for select
using (auth.uid() = id);

drop policy if exists "Profiles are insertable by owner" on public.profiles;
create policy "Profiles are insertable by owner"
on public.profiles for insert
with check (auth.uid() = id);

drop policy if exists "Profiles are updatable by owner" on public.profiles;
create policy "Profiles are updatable by owner"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Categories are readable by owner" on public.categories;
create policy "Categories are readable by owner"
on public.categories for select
using (auth.uid() = user_id);

drop policy if exists "Categories are insertable by owner" on public.categories;
create policy "Categories are insertable by owner"
on public.categories for insert
with check (auth.uid() = user_id);

drop policy if exists "Categories are updatable by owner" on public.categories;
create policy "Categories are updatable by owner"
on public.categories for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Categories are deletable by owner" on public.categories;
create policy "Categories are deletable by owner"
on public.categories for delete
using (auth.uid() = user_id);

drop policy if exists "Expenses are readable by owner" on public.expenses;
create policy "Expenses are readable by owner"
on public.expenses for select
using (auth.uid() = user_id);

drop policy if exists "Expenses are insertable by owner" on public.expenses;
create policy "Expenses are insertable by owner"
on public.expenses for insert
with check (auth.uid() = user_id);

drop policy if exists "Expenses are updatable by owner" on public.expenses;
create policy "Expenses are updatable by owner"
on public.expenses for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Expenses are deletable by owner" on public.expenses;
create policy "Expenses are deletable by owner"
on public.expenses for delete
using (auth.uid() = user_id);

drop policy if exists "Budgets are readable by owner" on public.budgets;
create policy "Budgets are readable by owner"
on public.budgets for select
using (auth.uid() = user_id);

drop policy if exists "Budgets are insertable by owner" on public.budgets;
create policy "Budgets are insertable by owner"
on public.budgets for insert
with check (auth.uid() = user_id);

drop policy if exists "Budgets are updatable by owner" on public.budgets;
create policy "Budgets are updatable by owner"
on public.budgets for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Budgets are deletable by owner" on public.budgets;
create policy "Budgets are deletable by owner"
on public.budgets for delete
using (auth.uid() = user_id);
