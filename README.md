# Budget Analyzer

A responsive expense tracker built with Vue 3 (Composition API), Vite, Pinia, Vue Router, TailwindCSS, Chart.js via vue-chartjs, and Supabase Auth/Postgres persistence.

## Features
- Add, edit, and delete expenses (description, category, amount, date)
- Dashboard summary: total spent, top category, transaction count
- Category-level monthly budgets with progress bars and over-budget alerts
- Filters by category and month
- Reports with pie (category breakdown) and bar (monthly trend) charts
- Smooth transitions, responsive UI, modern Tailwind design
- Supabase-backed login, registration, logout, and user-scoped budget data

## Tech Stack
- Vue 3 + Vite
- Pinia
- Vue Router
- TailwindCSS
- Chart.js + vue-chartjs
- Supabase Auth + Supabase Postgres

## Setup
```bash
npm install
cp .env.example .env
npm run dev
```

Add your Supabase project values to `.env`:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Open the dev server URL printed in the terminal.

## Supabase Database
Run [supabase/schema.sql](./supabase/schema.sql) in your Supabase SQL editor before using the app.

The app assumes these tables:
- `profiles`: one row per auth user, including `currency`.
- `categories`: user-owned category names. The app creates default categories for new users.
- `expenses`: user-owned expense rows with `description`, `category`, `amount`, and `date`.
- `budgets`: user-owned category budget limits. Budget progress is calculated against the currently selected expense filters.

The schema enables Row Level Security so each user can only read and mutate their own rows.

## Project Structure
- `src/services/`: Supabase client and table-specific service modules
- `src/store/auth.js`: Pinia auth store for Supabase sessions
- `src/store/expenses.js`: Pinia store for expense, budget, category, and profile-backed settings state
- `src/components/`: `ExpenseForm.vue`, `ExpenseList.vue`, `SummaryCards.vue`, `BudgetPlanner.vue`, `Charts.vue`
- `src/views/`: `Dashboard.vue`, `AddExpense.vue`, `Reports.vue`, auth views
- `src/router.js`: Protected routes `/`, `/add`, `/reports`, plus `/login`, `/register`, `/logout`
- `supabase/schema.sql`: Database table assumptions and RLS policies

## Notes
- LocalStorage persistence has been replaced with Supabase.
- Currency formatting defaults to the browser locale.
- Budget limits are stored separately from expenses so users can adjust goals without changing transaction history.
