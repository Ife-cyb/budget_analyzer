# Budget Analyzer — Project Context

## What this is
Budget tracker evolving from personal use into shared team budget tracking. Vue 3 (Composition API) + Vite + Pinia + Vue Router + Tailwind v4 + Chart.js (vue-chartjs) + Supabase (Auth + Postgres with RLS).

## Core architectural direction (Phase 2+)
**Workspace model.** All budget data (categories, transactions, budgets) belongs to a `workspace`, never directly to a user. A user's personal data lives in an auto-created `personal` workspace; team data lives in `team` workspaces. There is ONE data model and ONE set of RLS policies — membership-based, not `auth.uid() = user_id`.

- Roles: `owner`, `admin`, `member`, `viewer`.
- Members can create transactions and edit/delete their own; admins/owners can edit/delete anything; viewers are read-only.
- RLS uses `security definer` helper functions (`is_member`, `has_role`) to avoid recursive-policy pitfalls on `workspace_members`.
- Transactions carry `created_by` so team views can attribute spend per person.

## Commands
- `npm run dev` — dev server
- `npm run build` — production build (must pass before any task is considered done)
- `npm run preview` — preview production build

## Architecture conventions (follow these)
- **Service layer pattern**: all Supabase calls live in `src/services/*.js`. Stores never call Supabase directly. Each service normalizes rows (snake_case → camelCase) via a `normalize*` function and uses an explicit `SELECT` column list constant. Services take `workspaceId`, not `userId`.
- **Pinia stores**: auth store (session/profile), workspace store (workspace list + active workspace), transactions store (data scoped to active workspace). Stores own loading/saving/error flags. Optimistic where safe, rollback on failure.
- **RLS-first**: every table ships with membership-based RLS policies. `supabase/schema.sql` is the fresh-install source of truth and must stay idempotent. Upgrade scripts for the live database live in `supabase/migrations/` and must be transactional (`begin`/`commit`) and re-runnable where possible.
- **Naming**: the domain object is a **transaction** (type `expense` | `income`). Categories are referenced by `category_id` FK, never by name string.
- **Routing**: lazy-loaded views, `meta.requiresAuth` / `meta.guestOnly` guards.
- **Styling**: Tailwind utility classes inline, matching existing visual language.

## Environment
- `.env` requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- `src/services/supabaseClient.js` guards against missing config — preserve that behavior.

## Scope guardrails
- Do NOT build invitations, approval flows, or billing yet (Phase 3).
- Do NOT drop legacy columns/tables in the same migration that replaces them; deprecate first, drop in a follow-up migration after verification.
- Do NOT reformat files wholesale; keep diffs minimal and focused.
- Never weaken an RLS policy to "make a query work." If a query fails under RLS, the query or the policy design is wrong — stop and flag it.

## Definition of done for any task
1. `npm run build` passes with no errors.
2. New DB objects have membership-based RLS policies; `supabase/schema.sql` (fresh install) and `supabase/migrations/` (upgrade) both updated.
3. The RLS check script (`scripts/rls-check.mjs`) passes: cross-workspace reads/writes are denied.
4. README updated if setup steps changed.
