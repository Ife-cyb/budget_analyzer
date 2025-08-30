import { defineStore } from 'pinia'
import { format, parseISO } from 'date-fns'

const STORAGE_KEY = 'budget_analyzer_expenses_v1'
const SETTINGS_KEY = 'budget_analyzer_settings_v1'

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveToStorage(expenses) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses))
  } catch {
    // ignore
  }
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    // ignore
  }
}

function seedData() {
  const today = new Date()
  const sample = [
    { id: crypto.randomUUID(), description: 'Groceries', category: 'Food', amount: 54.23, date: format(today, 'yyyy-MM-01') },
    { id: crypto.randomUUID(), description: 'Electricity Bill', category: 'Utilities', amount: 85.5, date: format(today, 'yyyy-MM-05') },
    { id: crypto.randomUUID(), description: 'Internet', category: 'Utilities', amount: 40.0, date: format(today, 'yyyy-MM-07') },
    { id: crypto.randomUUID(), description: 'Gym', category: 'Health', amount: 25.0, date: format(today, 'yyyy-MM-09') },
    { id: crypto.randomUUID(), description: 'Coffee', category: 'Food', amount: 3.75, date: format(today, 'yyyy-MM-12') },
    { id: crypto.randomUUID(), description: 'Taxi', category: 'Transport', amount: 12.0, date: format(today, 'yyyy-MM-15') },
  ]
  return sample
}

export const useExpensesStore = defineStore('expenses', {
  state: () => ({
    expenses: [],
    categories: ['Food', 'Transport', 'Entertainment', 'Utilities', 'Health', 'Education', 'Other'],
    filters: {
      category: 'All',
      month: 'All', // format yyyy-MM
    },
    settings: {
      currency: 'USD', // 'USD', 'NGN', 'GBP'
    },
  }),
  getters: {
    filteredExpenses(state) {
      return state.expenses.filter((e) => {
        const matchesCategory = state.filters.category === 'All' || e.category === state.filters.category
        const matchesMonth = state.filters.month === 'All' || e.date.startsWith(state.filters.month)
        return matchesCategory && matchesMonth
      }).sort((a, b) => new Date(b.date) - new Date(a.date))
    },
    totalSpent(state) {
      return this.filteredExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0)
    },
    spendByCategory() {
      const map = {}
      for (const e of this.filteredExpenses) {
        map[e.category] = (map[e.category] || 0) + Number(e.amount)
      }
      return map
    },
    monthlySeries() {
      const buckets = {}
      for (const e of this.filteredExpenses) {
        const month = e.date.slice(0, 7)
        buckets[month] = (buckets[month] || 0) + Number(e.amount)
      }
      return Object.entries(buckets).sort(([a], [b]) => (a > b ? 1 : -1))
    },
    topCategory() {
      const byCat = this.spendByCategory
      let top = null
      for (const [cat, amt] of Object.entries(byCat)) {
        if (!top || amt > top.amount) top = { category: cat, amount: amt }
      }
      return top
    },
    monthsAvailable(state) {
      const set = new Set(state.expenses.map((e) => e.date.slice(0, 7)))
      return ['All', ...Array.from(set).sort()]
    },
    currencyFormatter(state) {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: state.settings.currency })
    },
  },
  actions: {
    init() {
      const saved = loadFromStorage()
      if (saved && Array.isArray(saved) && saved.length) {
        this.expenses = saved
      } else {
        this.expenses = seedData()
        saveToStorage(this.expenses)
      }
      const settings = loadSettings()
      if (settings && settings.currency) {
        this.settings.currency = settings.currency
      } else {
        saveSettings(this.settings)
      }
    },
    validate(payload) {
      const errors = {}
      if (!payload.description || payload.description.trim().length === 0) errors.description = 'Description is required'
      if (!payload.category || payload.category.trim().length === 0) errors.category = 'Category is required'
      if (payload.amount === undefined || payload.amount === null || Number(payload.amount) <= 0) errors.amount = 'Amount must be greater than 0'
      if (!payload.date) errors.date = 'Date is required'
      else {
        const d = parseISO(payload.date)
        if (isNaN(d)) errors.date = 'Invalid date'
      }
      return errors
    },
    addExpense(payload) {
      const errors = this.validate(payload)
      if (Object.keys(errors).length) throw errors
      this.expenses.push({ id: crypto.randomUUID(), ...payload, amount: Number(payload.amount) })
      saveToStorage(this.expenses)
    },
    updateExpense(id, payload) {
      const errors = this.validate(payload)
      if (Object.keys(errors).length) throw errors
      const idx = this.expenses.findIndex((e) => e.id === id)
      if (idx !== -1) {
        this.expenses[idx] = { id, ...payload, amount: Number(payload.amount) }
        saveToStorage(this.expenses)
      }
    },
    removeExpense(id) {
      this.expenses = this.expenses.filter((e) => e.id !== id)
      saveToStorage(this.expenses)
    },
    setFilterCategory(category) {
      this.filters.category = category
    },
    setFilterMonth(month) {
      this.filters.month = month
    },
    setCurrency(code) {
      this.settings.currency = code
      saveSettings(this.settings)
    },
    formatCurrency(value) {
      try {
        return new Intl.NumberFormat(undefined, { style: 'currency', currency: this.settings.currency }).format(Number(value || 0))
      } catch {
        return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(Number(value || 0))
      }
    },
  },
}) 