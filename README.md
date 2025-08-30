# Budget Analyzer

A responsive expense tracker built with Vue 3 (Composition API), Vite, Pinia, Vue Router, TailwindCSS, and Chart.js via vue-chartjs. Data persists in LocalStorage.

## Features
- Add, edit, and delete expenses (description, category, amount, date)
- Dashboard summary: total spent, top category, transaction count
- Filters by category and month
- Reports with pie (category breakdown) and bar (monthly trend) charts
- Smooth transitions, responsive UI, modern Tailwind design

## Tech Stack
- Vue 3 + Vite
- Pinia (state + LocalStorage persistence)
- Vue Router
- TailwindCSS
- Chart.js + vue-chartjs

## Setup
```bash
npm install
npm run dev
```

Open the dev server URL printed in the terminal.

## Project Structure
- `src/store/expenses.js`: Pinia store with seed data and persistence
- `src/components/`: `ExpenseForm.vue`, `ExpenseList.vue`, `SummaryCards.vue`, `Charts.vue`
- `src/views/`: `Dashboard.vue`, `AddExpense.vue`, `Reports.vue`
- `src/router.js`: Routes `/`, `/add`, `/reports`

## Notes
- Seed data is injected on first run; subsequent changes persist in LocalStorage.
- Currency formatting defaults to the browser locale.
