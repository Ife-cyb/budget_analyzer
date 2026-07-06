import { defineStore } from 'pinia'
import { format, parseISO, subMonths } from 'date-fns'
import {
  copyBudgets,
  deleteBudget,
  listBudgetHistory,
  listBudgets,
  upsertBudget,
} from '../services/budgetService'
import {
  createCategory,
  deleteCategory,
  ensureDefaultCategories,
  renameCategory,
} from '../services/categoryService'
import {
  createTransaction,
  deleteTransaction,
  listTransactions,
  updateTransaction,
} from '../services/transactionService'
import { DEFAULT_CURRENCY, getOrCreateProfile, updateProfileCurrency } from '../services/profileService'
import { useAuthStore } from './auth'
import { useWorkspaceStore } from './workspace'

const TRANSACTION_TYPES = ['expense', 'income']

function errorMessage(error) {
  return error?.message || 'Something went wrong. Please try again.'
}

function currentMonthStart() {
  return `${new Date().toISOString().slice(0, 7)}-01`
}

function budgetsByCategoryId(rows) {
  return rows.reduce((acc, row) => {
    acc[row.categoryId] = Number(row.amount)
    return acc
  }, {})
}

export const useTransactionsStore = defineStore('transactions', {
  state: () => ({
    userId: null,
    workspaceId: null,
    transactions: [],
    categories: [],
    filters: {
      category: 'All',
      month: 'All',
    },
    settings: {
      currency: DEFAULT_CURRENCY,
    },
    budgetMonth: currentMonthStart(),
    budgets: {},
    budgetHistory: [],
    loading: false,
    saving: false,
    settingsSaving: false,
    budgetSaving: false,
    budgetsLoading: false,
    budgetHistoryLoading: false,
    categorySaving: false,
    deletingIds: [],
    deletingBudgets: [],
    initialized: false,
    error: null,
  }),
  getters: {
    categoryNames(state) {
      return state.categories.map((c) => c.name)
    },
    categoriesById(state) {
      return Object.fromEntries(state.categories.map((c) => [c.id, c]))
    },
    filteredTransactions(state) {
      return state.transactions
        .filter((t) => {
          const matchesCategory = state.filters.category === 'All' || t.category === state.filters.category
          const matchesMonth = state.filters.month === 'All' || t.date.startsWith(state.filters.month)
          return matchesCategory && matchesMonth
        })
        .sort((a, b) => new Date(b.date) - new Date(a.date))
    },
    totalSpent() {
      return this.filteredTransactions
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount || 0), 0)
    },
    totalIncome() {
      return this.filteredTransactions
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount || 0), 0)
    },
    netCashFlow() {
      return this.totalIncome - this.totalSpent
    },
    spendByCategory() {
      const map = {}
      for (const t of this.filteredTransactions) {
        if (t.type !== 'expense') continue
        map[t.category] = (map[t.category] || 0) + Number(t.amount)
      }
      return map
    },
    monthlySeries() {
      const buckets = {}
      for (const t of this.filteredTransactions) {
        if (t.type !== 'expense') continue
        const month = t.date.slice(0, 7)
        buckets[month] = (buckets[month] || 0) + Number(t.amount)
      }
      return Object.entries(buckets).sort(([a], [b]) => (a > b ? 1 : -1))
    },
    monthlyTypeSeries() {
      const buckets = {}
      for (const t of this.filteredTransactions) {
        const month = t.date.slice(0, 7)
        buckets[month] ||= { month, expense: 0, income: 0 }
        buckets[month][t.type === 'income' ? 'income' : 'expense'] += Number(t.amount)
      }
      return Object.values(buckets).sort((a, b) => (a.month > b.month ? 1 : -1))
    },
    budgetMonthLabel(state) {
      return format(parseISO(state.budgetMonth), 'MMMM yyyy')
    },
    // Strict: budget month × expense-type transactions × workspace.
    // Deliberately ignores the dashboard category/month filters.
    budgetProgress(state) {
      const monthPrefix = state.budgetMonth.slice(0, 7)
      return Object.entries(state.budgets)
        .filter(([, limit]) => Number(limit) > 0)
        .map(([categoryId, limit]) => {
          const category = this.categoriesById[categoryId]?.name || 'Unknown'
          const spent = state.transactions
            .filter((t) => t.type === 'expense' && t.categoryId === categoryId && t.date.startsWith(monthPrefix))
            .reduce((sum, t) => sum + Number(t.amount || 0), 0)
          const numericLimit = Number(limit)
          const percent = numericLimit > 0 ? (spent / numericLimit) * 100 : 0
          return {
            categoryId,
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
    budgetVsActual(state) {
      const spend = {}
      for (const t of state.transactions) {
        if (t.type !== 'expense') continue
        const key = `${t.date.slice(0, 7)}:${t.categoryId}`
        spend[key] = (spend[key] || 0) + Number(t.amount)
      }

      const byMonth = {}
      for (const b of state.budgetHistory) {
        ;(byMonth[b.month] ||= []).push(b)
      }

      return Object.entries(byMonth)
        .sort(([a], [b]) => (a > b ? -1 : 1))
        .map(([month, rows]) => ({
          month,
          label: format(parseISO(month), 'MMMM yyyy'),
          rows: rows
            .map((b) => {
              const actual = spend[`${month.slice(0, 7)}:${b.categoryId}`] || 0
              return {
                categoryId: b.categoryId,
                category: this.categoriesById[b.categoryId]?.name || 'Unknown',
                budget: Number(b.amount),
                actual,
                percent: Number(b.amount) > 0 ? (actual / Number(b.amount)) * 100 : 0,
                overBudget: actual > Number(b.amount),
              }
            })
            .sort((a, b) => b.percent - a.percent),
        }))
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
      const set = new Set(state.transactions.map((t) => t.date.slice(0, 7)))
      return ['All', ...Array.from(set).sort()]
    },
    categoryUsage(state) {
      const map = {}
      for (const t of state.transactions) {
        map[t.categoryId] = (map[t.categoryId] || 0) + 1
      }
      return map
    },
    currencyFormatter(state) {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: state.settings.currency })
    },
  },
  actions: {
    reset() {
      this.userId = null
      this.workspaceId = null
      this.transactions = []
      this.categories = []
      this.filters = { category: 'All', month: 'All' }
      this.settings = { currency: DEFAULT_CURRENCY }
      this.budgetMonth = currentMonthStart()
      this.budgets = {}
      this.budgetHistory = []
      this.loading = false
      this.saving = false
      this.settingsSaving = false
      this.budgetSaving = false
      this.budgetsLoading = false
      this.budgetHistoryLoading = false
      this.categorySaving = false
      this.deletingIds = []
      this.deletingBudgets = []
      this.initialized = false
      this.error = null
    },
    async init({ force = false } = {}) {
      const authStore = useAuthStore()
      const workspaceStore = useWorkspaceStore()

      if (!authStore.initialized) {
        await authStore.initialize()
      }

      if (!authStore.user) {
        this.reset()
        return
      }

      if (!workspaceStore.initialized || workspaceStore.userId !== authStore.user.id) {
        await workspaceStore.init()
      }

      const workspaceId = workspaceStore.activeWorkspaceId
      if (!workspaceId) {
        this.reset()
        this.error = 'No workspace available. Please try reloading.'
        return
      }

      if (!force && this.initialized && this.userId === authStore.user.id && this.workspaceId === workspaceId) {
        return
      }

      this.loading = true
      this.error = null
      this.userId = authStore.user.id
      this.workspaceId = workspaceId

      try {
        const [profile, categories, transactions, budgets] = await Promise.all([
          getOrCreateProfile(authStore.user),
          ensureDefaultCategories(workspaceId, authStore.user.id),
          listTransactions(workspaceId),
          listBudgets(workspaceId, this.budgetMonth),
        ])

        this.settings.currency = profile?.currency || DEFAULT_CURRENCY
        this.categories = categories
        this.transactions = transactions
        this.budgets = budgetsByCategoryId(budgets)
        this.budgetHistory = []
        this.filters = { category: 'All', month: 'All' }
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
      if (!payload.categoryId) errors.categoryId = 'Category is required'
      else if (!this.categoriesById[payload.categoryId]) errors.categoryId = 'Unknown category'
      if (payload.type && !TRANSACTION_TYPES.includes(payload.type)) errors.type = 'Invalid transaction type'
      if (payload.amount === undefined || payload.amount === null || Number(payload.amount) <= 0) errors.amount = 'Amount must be greater than 0'
      if (!payload.date) errors.date = 'Date is required'
      else {
        const d = parseISO(payload.date)
        if (isNaN(d)) errors.date = 'Invalid date'
      }
      return errors
    },
    ensureWorkspace() {
      if (!this.userId || !this.workspaceId) {
        throw new Error('You must be signed in to manage budget data.')
      }
    },
    async addTransaction(payload) {
      const errors = this.validate(payload)
      if (Object.keys(errors).length) throw errors

      this.ensureWorkspace()
      this.saving = true
      this.error = null

      try {
        const transaction = await createTransaction(this.workspaceId, this.userId, {
          ...payload,
          amount: Number(payload.amount),
        })
        this.transactions.push(transaction)
        return transaction
      } catch (error) {
        this.error = errorMessage(error)
        throw error
      } finally {
        this.saving = false
      }
    },
    async updateTransaction(id, payload) {
      const errors = this.validate(payload)
      if (Object.keys(errors).length) throw errors

      this.ensureWorkspace()
      this.saving = true
      this.error = null

      try {
        const transaction = await updateTransaction(this.workspaceId, id, {
          ...payload,
          amount: Number(payload.amount),
        })
        const idx = this.transactions.findIndex((t) => t.id === id)
        if (idx !== -1) {
          this.transactions[idx] = transaction
        }
        return transaction
      } catch (error) {
        this.error = errorMessage(error)
        throw error
      } finally {
        this.saving = false
      }
    },
    async removeTransaction(id) {
      this.ensureWorkspace()
      this.deletingIds = [...this.deletingIds, id]
      this.error = null

      try {
        await deleteTransaction(this.workspaceId, id)
        this.transactions = this.transactions.filter((t) => t.id !== id)
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
      this.ensureWorkspace()
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
    async setBudgetMonth(month) {
      // Accepts 'YYYY-MM' (from <input type="month">) or 'YYYY-MM-01'.
      const normalized = month?.length === 7 ? `${month}-01` : month
      if (!normalized || normalized === this.budgetMonth) return

      this.ensureWorkspace()
      const previousMonth = this.budgetMonth
      this.budgetMonth = normalized
      this.budgetsLoading = true
      this.error = null

      try {
        const budgets = await listBudgets(this.workspaceId, normalized)
        this.budgets = budgetsByCategoryId(budgets)
      } catch (error) {
        this.budgetMonth = previousMonth
        this.error = errorMessage(error)
        throw error
      } finally {
        this.budgetsLoading = false
      }
    },
    async copyBudgetsFromPreviousMonth() {
      this.ensureWorkspace()
      const previousMonth = format(subMonths(parseISO(this.budgetMonth), 1), 'yyyy-MM-01')

      this.budgetSaving = true
      this.error = null

      try {
        const previousBudgets = await listBudgets(this.workspaceId, previousMonth)
        if (previousBudgets.length === 0) {
          throw new Error(`No budgets found for ${format(parseISO(previousMonth), 'MMMM yyyy')}.`)
        }

        await copyBudgets(this.workspaceId, this.budgetMonth, previousBudgets)
        const budgets = await listBudgets(this.workspaceId, this.budgetMonth)
        this.budgets = budgetsByCategoryId(budgets)
        return previousBudgets.length
      } catch (error) {
        this.error = errorMessage(error)
        throw error
      } finally {
        this.budgetSaving = false
      }
    },
    async loadBudgetHistory() {
      this.ensureWorkspace()
      this.budgetHistoryLoading = true

      try {
        this.budgetHistory = await listBudgetHistory(this.workspaceId)
      } catch (error) {
        this.error = errorMessage(error)
        throw error
      } finally {
        this.budgetHistoryLoading = false
      }
    },
    async setBudget(categoryId, amount) {
      const numericAmount = Number(amount)
      if (!categoryId || Number.isNaN(numericAmount) || numericAmount < 0) return

      this.ensureWorkspace()
      this.budgetSaving = true
      this.error = null

      try {
        if (numericAmount === 0) {
          await deleteBudget(this.workspaceId, categoryId, this.budgetMonth)
          delete this.budgets[categoryId]
          return
        }

        const budget = await upsertBudget(this.workspaceId, categoryId, this.budgetMonth, numericAmount)
        this.budgets[budget.categoryId] = budget.amount
      } catch (error) {
        this.error = errorMessage(error)
        throw error
      } finally {
        this.budgetSaving = false
      }
    },
    async removeBudget(categoryId) {
      this.ensureWorkspace()
      this.deletingBudgets = [...this.deletingBudgets, categoryId]
      this.error = null

      try {
        await deleteBudget(this.workspaceId, categoryId, this.budgetMonth)
        delete this.budgets[categoryId]
      } catch (error) {
        this.error = errorMessage(error)
        throw error
      } finally {
        this.deletingBudgets = this.deletingBudgets.filter((item) => item !== categoryId)
      }
    },
    async addCategory(name) {
      const trimmed = String(name || '').trim()
      if (!trimmed) throw new Error('Category name is required.')
      if (this.categoryNames.some((n) => n.toLowerCase() === trimmed.toLowerCase())) {
        throw new Error('A category with that name already exists.')
      }

      this.ensureWorkspace()
      this.categorySaving = true
      this.error = null

      try {
        const category = await createCategory(this.workspaceId, this.userId, trimmed)
        this.categories = [...this.categories, category].sort((a, b) => a.name.localeCompare(b.name))
        return category
      } catch (error) {
        this.error = errorMessage(error)
        throw error
      } finally {
        this.categorySaving = false
      }
    },
    async renameCategory(id, name) {
      const trimmed = String(name || '').trim()
      if (!trimmed) throw new Error('Category name is required.')
      if (this.categories.some((c) => c.id !== id && c.name.toLowerCase() === trimmed.toLowerCase())) {
        throw new Error('A category with that name already exists.')
      }

      this.ensureWorkspace()
      this.categorySaving = true
      this.error = null

      try {
        const category = await renameCategory(this.workspaceId, id, trimmed)
        this.categories = this.categories
          .map((c) => (c.id === id ? category : c))
          .sort((a, b) => a.name.localeCompare(b.name))
        // Keep denormalized names on loaded transactions in sync.
        this.transactions = this.transactions.map((t) =>
          t.categoryId === id ? { ...t, category: category.name } : t
        )
        if (this.filters.category !== 'All' && !this.categoryNames.includes(this.filters.category)) {
          this.filters.category = category.name
        }
        return category
      } catch (error) {
        this.error = errorMessage(error)
        throw error
      } finally {
        this.categorySaving = false
      }
    },
    async removeCategory(id) {
      this.ensureWorkspace()

      if ((this.categoryUsage[id] || 0) > 0) {
        throw new Error('This category is used by existing transactions. Reassign them first.')
      }

      this.categorySaving = true
      this.error = null

      try {
        await deleteCategory(this.workspaceId, id)
        this.categories = this.categories.filter((c) => c.id !== id)
        delete this.budgets[id]
      } catch (error) {
        // The FK from transactions blocks deletes the local check missed
        // (e.g. rows outside the loaded workspace snapshot).
        const message = /foreign key/i.test(error?.message || '')
          ? 'This category is used by existing transactions. Reassign them first.'
          : errorMessage(error)
        this.error = message
        throw new Error(message)
      } finally {
        this.categorySaving = false
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
