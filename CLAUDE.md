# Budget Analyzer — Project Context

## What this is
Personal budget tracker being evolved into a company-grade tool. Vue 3 (Composition API) + Vite + Pinia + Vue Router + Tailwind v4 + Chart.js (vue-chartjs) + Supabase (Auth + Postgres with RLS).

## Commands
- `npm run dev` — dev server
- `npm run build` — production build (must pass before any task is considered done)
- `npm run preview` — preview production build

## Architecture conventions (follow these)
- **Service layer pattern**: all Supabase calls live in `src/services/*.js`. Stores never call Supabase directly. Each service normalizes rows (snake_case → camelCase) via a `normalize*` function and uses an explicit `SELECT` column list constant.
- **Pinia stores**: `src/store/auth.js` (session/profile), `src/store/expenses.js` (all budget data). Stores own loading/saving/error flags and validation. Follow the existing pattern: optimistic where safe, rollback on failure (see `setCurrency`).
- **RLS-first**: every table has row-level security scoped to `auth.uid()`. Any new column or table must ship with matching RLS policies in `supabase/schema.sql`. Schema file must stay idempotent (`if not exists`, `drop policy if exists` before `create policy`).
- **Routing**: lazy-loaded views, `meta.requiresAuth` / `meta.guestOnly` guards in `src/router.js`.
- **Styling**: Tailwind utility classes inline. Match existing visual language (rounded-md, gray borders, primary accents).

## Environment
- `.env` requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (see `.env.example`).
- `src/services/supabaseClient.js` guards against missing config — preserve that behavior.

## Current scope guardrails (Phase 1)
- Do NOT refactor categories to foreign keys yet (Phase 2).
- Do NOT migrate to TypeScript yet (Phase 2).
- Do NOT add org/multi-tenant concepts yet (Phase 3).
- Do NOT reformat files wholesale; keep diffs minimal and focused.
- Keep the `expenses` table name even though it now holds income rows (rename is Phase 2).

## Definition of done for any task
1. `npm run build` passes with no errors.
2. New DB objects have RLS policies and appear in `supabase/schema.sql` idempotently.
3. README updated if setup steps changed.
