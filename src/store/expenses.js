import { defineStore } from 'pinia'
import { parseISO } from 'date-fns'
import { deleteBudget, listBudgets, upsertBudget } from '../services/budgetService'
import { DEFAULT_CATEGORIES, ensureDefaultCategories } from '../services/categoryService'
import { createExpense, deleteExpense, listExpenses, updateExpense } from '../services/expenseService'
import { DEFAULT_CURRENCY, getOrCreateProfile, updateProfileCurrency } from '../services/profileService'
import { useAuthStore } from './auth'

function errorMessage(error) {
  return error?.message || 'Something went wrong. Please try again.'
}

function budgetsByCategory(rows) {
  return rows.reduce((acc, row) => {
    acc[row.category] = Number(row.amount)
    return acc
  }, {})
}

export const useExpensesStore = defineStore('expenses', {
  state: () => ({
    userId: null,
    expenses: [],
    categories: [...DEFAULT_CATEGORIES],
    filters: {
      category: 'All',
      month: 'All',
    },
    settings: {
      currency: DEFAULT_CURRENCY,
    },
    budgets: {},
    loading: false,
    saving: false,
    settingsSaving: false,
    budgetSaving: false,
    deletingIds: [],
    deletingBudgets: [],
    initialized: false,
    error: null,
  }),
  getters: {
    filteredExpenses(state) {
      return state.expenses
        .filter((e) => {
          const matchesCategory = state.filters.category === 'All' || e.category === state.filters.category
          const matchesMonth = state.filters.month === 'All' || e.date.startsWith(state.filters.month)
          return matchesCategory && matchesMonth
        })
        .sort((a, b) => new Date(b.date) - new Date(a.date))
    },
    totalSpent() {
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
    budgetProgress(state) {
      return Object.entries(state.budgets)
        .filter(([, limit]) => Number(limit) > 0)
        .map(([category, limit]) => {
          const spent = this.filteredExpenses
            .filter((e) => e.category === category)
            .reduce((sum, e) => sum + Number(e.amount || 0), 0)
          const numericLimit = Number(limit)
          const percent = numericLimit > 0 ? (spent / numericLimit) * 100 : 0
          return {
            category,
            limit: numericLimit,
            spent,
            percent,
            remaining: numericLimit - spent,
            overBudget: spent > numericLimit,
          }
        })
        .sort((a, b) => b.percent - a.percent)
    },
    budgetAlerts() {
      return this.budgetProgress.filter((row) => row.percent >= 80)
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
    reset() {
      this.userId = null
      this.expenses = []
      this.categories = [...DEFAULT_CATEGORIES]
      this.filters = { category: 'All', month: 'All' }
      this.settings = { currency: DEFAULT_CURRENCY }
      this.budgets = {}
      this.loading = false
      this.saving = false
      this.settingsSaving = false
      this.budgetSaving = false
      this.deletingIds = []
      this.deletingBudgets = []
      this.initialized = false
      this.error = null
    },
    async init({ force = false } = {}) {
      const authStore = useAuthStore()
      if (!authStore.initialized) {
        await authStore.initialize()
      }

      if (!authStore.user) {
        this.reset()
        return
      }

      if (!force && this.initialized && this.userId === authStore.user.id) {
        return
      }

      this.loading = true
      this.error = null
      this.userId = authStore.user.id

      try {
        const [profile, categories, expenses, budgets] = await Promise.all([
          getOrCreateProfile(authStore.user),
          ensureDefaultCategories(authStore.user.id),
          listExpenses(authStore.user.id),
          listBudgets(authStore.user.id),
        ])

        this.settings.currency = profile?.currency || DEFAULT_CURRENCY
        this.categories = categories.length ? categories : [...DEFAULT_CATEGORIES]
        this.expenses = expenses
        this.budgets = budgetsByCategory(budgets)
        this.initialized = true
      } catch (error) {
        this.error = errorMessage(error)
        throw error
      } finally {
        this.loading = false
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
    ensureUser() {
      if (!this.userId) {
        throw new Error('You must be signed in to manage budget data.')
      }
    },
    async addExpense(payload) {
      const errors = this.validate(payload)
      if (Object.keys(errors).length) throw errors

      this.ensureUser()
      this.saving = true
      this.error = null

      try {
        const expense = await createExpense(this.userId, {
          ...payload,
          amount: Number(payload.amount),
        })
        this.expenses.push(expense)
        return expense
      } catch (error) {
        this.error = errorMessage(error)
        throw error
      } finally {
        this.saving = false
      }
    },
    async updateExpense(id, payload) {
      const errors = this.validate(payload)
      if (Object.keys(errors).length) throw errors

      this.ensureUser()
      this.saving = true
      this.error = null

      try {
        const expense = await updateExpense(this.userId, id, {
          ...payload,
          amount: Number(payload.amount),
        })
        const idx = this.expenses.findIndex((e) => e.id === id)
        if (idx !== -1) {
          this.expenses[idx] = expense
        }
        return expense
      } catch (error) {
        this.error = errorMessage(error)
        throw error
      } finally {
        this.saving = false
      }
    },
    async removeExpense(id) {
      this.ensureUser()
      this.deletingIds = [...this.deletingIds, id]
      this.error = null

      try {
        await deleteExpense(this.userId, id)
        this.expenses = this.expenses.filter((e) => e.id !== id)
      } catch (error) {
        this.error = errorMessage(error)
        throw error
      } finally {
        this.deletingIds = this.deletingIds.filter((deletingId) => deletingId !== id)
      }
    },
    setFilterCategory(category) {
      this.filters.category = category
    },
    setFilterMonth(month) {
      this.filters.month = month
    },
    async setCurrency(code) {
      this.ensureUser()
      const previousCurrency = this.settings.currency
      this.settings.currency = code
      this.settingsSaving = true
      this.error = null

      try {
        const profile = await updateProfileCurrency(this.userId, code)
        this.settings.currency = profile.currency
      } catch (error) {
        this.settings.currency = previousCurrency
        this.error = errorMessage(error)
        throw error
      } finally {
        this.settingsSaving = false
      }
    },
    async setBudget(category, amount) {
      const numericAmount = Number(amount)
      if (!category || Number.isNaN(numericAmount) || numericAmount < 0) return

      this.ensureUser()
      this.budgetSaving = true
      this.error = null

      try {
        if (numericAmount === 0) {
          await deleteBudget(this.userId, category)
          delete this.budgets[category]
          return
        }

        const budget = await upsertBudget(this.userId, category, numericAmount)
        this.budgets[budget.category] = budget.amount
      } catch (error) {
        this.error = errorMessage(error)
        throw error
      } finally {
        this.budgetSaving = false
      }
    },
    async removeBudget(category) {
      this.ensureUser()
      this.deletingBudgets = [...this.deletingBudgets, category]
      this.error = null

      try {
        await deleteBudget(this.userId, category)
        delete this.budgets[category]
      } catch (error) {
        this.error = errorMessage(error)
        throw error
      } finally {
        this.deletingBudgets = this.deletingBudgets.filter((item) => item !== category)
      }
    },
    formatCurrency(value) {
      try {
        return new Intl.NumberFormat(undefined, { style: 'currency', currency: this.settings.currency }).format(Number(value || 0))
      } catch {
        return new Intl.NumberFormat(undefined, { style: 'currency', currency: DEFAULT_CURRENCY }).format(Number(value || 0))
      }
    },
  },
})
