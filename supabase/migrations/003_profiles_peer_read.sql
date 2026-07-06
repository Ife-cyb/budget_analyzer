-- 003_profiles_peer_read.sql — Phase 2 Task 3 support.
--
-- Members of a shared workspace must be able to resolve each other's
-- display name/email ("added by" on transaction rows, member lists).
-- The legacy policy only allowed reading your own profile.
--
-- Idempotent: safe to re-run. Run after 002_workspaces.sql.

begin;

-- Security definer to avoid RLS recursion through workspace_members
create or replace function public.shares_workspace_with(target uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1
    from workspace_members me
    join workspace_members them on them.workspace_id = me.workspace_id
    where me.user_id = auth.uid() and them.user_id = target
  );
$$;

drop policy if exists "Profiles are readable by owner" on public.profiles;
drop policy if exists "Profiles are readable by owner or workspace peers" on public.profiles;
create policy "Profiles are readable by owner or workspace peers"
on public.profiles for select
using (auth.uid() = id or public.shares_workspace_with(id));

commit;
