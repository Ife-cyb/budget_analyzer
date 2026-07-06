# Phase 1 — Ship for Personal Use

Execute tasks in order. Run `npm run build` after each task. Keep diffs minimal.

---

## Task 1 — Repo cleanup + shared layout
- Delete `src/components/HelloWorld.vue` (unused scaffold).
- Extract the header/nav currently duplicated inside views (see `src/views/Dashboard.vue`) into a shared `AppNav.vue` component rendered from `App.vue` for authenticated routes only. Nav links: Dashboard, Add Transaction, Reports, Logout. Active link gets the primary style.

## Task 2 — Income support (transaction types)
**Migration** (append to `supabase/schema.sql` AND provide as a standalone snippet I can run in the Supabase SQL editor):

```sql
alter table public.expenses
  add column if not exists type text not null default 'expense'
  check (type in ('expense', 'income'));

create index if not exists expenses_user_date_idx
  on public.expenses (user_id, date desc);
```

**App changes:**
- `expenseService.js`: include `type` in the SELECT constant, `normalizeExpense`, and `expensePayload`.
- `ExpenseForm.vue`: add a type toggle (Expense / Income), default Expense. Rename user-facing copy from "Add Expense" to "Add Transaction" (route paths stay the same).
- `store/expenses.js`:
  - `validate()` requires `type` to be `'expense'` or `'income'`.
  - `totalSpent` sums only `type === 'expense'` rows.
  - New getters: `totalIncome` (income rows), `netCashFlow` (income − expenses).
  - `spendByCategory`, `monthlySeries`, `budgetProgress`, `topCategory` must count expenses only.
- `SummaryCards.vue`: show Income, Expenses, Net Cash Flow (green when ≥ 0, red when negative), plus existing top category / transaction count.
- `ExpenseList.vue`: visually distinguish income rows (green amount, `+` prefix) from expenses.
- `Charts.vue` / `Reports.vue`: pie chart stays expenses-only by category; bar chart becomes grouped or stacked income-vs-expense per month if straightforward, otherwise expenses-only with income as a second dataset.

## Task 3 — Fix budget-vs-month semantics
Current bug: `budgetProgress` compares a monthly category limit against whatever the active filters return (including "All" months), which makes progress bars meaningless.

Fix:
- Budget progress must always compute against exactly one month of expense-type transactions.
- If `filters.month === 'All'`, use the current calendar month for budget progress (label the BudgetPlanner section with the month being evaluated, e.g. "Budgets — July 2026").
- If a specific month is selected, use that month.
- Category filter should NOT hide budget rows; budgets always show all categories that have limits.
- Keep the ≥80% alert threshold and over-budget states.

## Task 4 — Password reset flow
- `authService.js`: add `sendPasswordReset(email)` using `supabase.auth.resetPasswordForEmail(email, { redirectTo: <origin>/reset-password })` and `updatePassword(newPassword)` using `supabase.auth.updateUser`.
- New views: `views/auth/ForgotPassword.vue` (email form + success state) and `views/auth/ResetPassword.vue` (new password form; handles the recovery session Supabase creates from the email link — listen for the `PASSWORD_RECOVERY` auth event or an active session).
- Routes: `/forgot-password` (guestOnly), `/reset-password` (no guard — the recovery link must be able to land here).
- Add a "Forgot password?" link on the Login view.

## Task 5 — Deploy prep (Vercel)
- Add `vercel.json` at repo root with an SPA rewrite so Vue Router history mode works on refresh/deep links:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

- Update README: deployment section (Vercel import → set `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` env vars → deploy), note about adding the production URL to Supabase Auth → URL Configuration (Site URL + redirect URLs, including `/reset-password`).
- Update README feature list and any stale references (income support, budget month behavior).

---

## Acceptance criteria
1. `npm run build` passes; no console errors in dev on Dashboard, Add, Reports, auth pages.
2. Adding an income transaction increases Income and Net Cash Flow but never appears in category budgets, pie chart, or "total spent".
3. With month filter on "All", budget bars reflect the current month only, and the UI says which month.
4. Full password reset round-trip works against a real Supabase project.
5. Deep-linking to `/reports` on the deployed site does not 404.
6. `supabase/schema.sql` remains runnable end-to-end on a fresh project.
