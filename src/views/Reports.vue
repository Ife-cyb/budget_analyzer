<script setup>
import { ref, computed, onMounted } from 'vue'
import { useTransactionsStore } from '../store/transactions'
import Charts from '../components/Charts.vue'

const store = useTransactionsStore()
const selectedCategory = ref('All')
const selectedMonth = ref('All')

onMounted(async () => {
  try {
    await store.init()
    await store.loadBudgetHistory()
  } catch {
    // Store-level error state is rendered below.
  } finally {
    selectedCategory.value = store.filters.category
    selectedMonth.value = store.filters.month
  }
})

const categories = computed(() => ['All', ...store.categoryNames])
const months = computed(() => store.monthsAvailable)
const alerts = computed(() => store.budgetAlerts)
const budgetVsActual = computed(() => store.budgetVsActual)

function applyFilters() {
  store.setFilterCategory(selectedCategory.value)
  store.setFilterMonth(selectedMonth.value)
}
</script>

<template>
  <div class="max-w-6xl mx-auto px-4 py-6 space-y-6">
    <header class="flex items-center justify-between">
      <h2 class="text-xl font-semibold">Reports</h2>
      <RouterLink to="/" class="text-primary">Back to Dashboard</RouterLink>
    </header>

    <p v-if="store.loading" class="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-700">
      Loading your reports...
    </p>

    <p v-if="store.error" class="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      {{ store.error }}
    </p>

    <div class="flex flex-col sm:flex-row gap-3">
      <select v-model="selectedCategory" @change="applyFilters" class="px-3 py-2 rounded-md border border-gray-300 bg-white">
        <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
      </select>
      <select v-model="selectedMonth" @change="applyFilters" class="px-3 py-2 rounded-md border border-gray-300 bg-white">
        <option v-for="m in months" :key="m" :value="m">{{ m }}</option>
      </select>
    </div>

    <section class="bg-white rounded-lg shadow p-4 space-y-3">
      <div class="flex items-center justify-between gap-3">
        <div>
          <p class="text-xs uppercase tracking-wide text-gray-500">Budget Health</p>
          <h3 class="font-semibold">Categories near or above budget — {{ store.budgetMonthLabel }}</h3>
        </div>
        <RouterLink to="/" class="text-sm text-primary">Manage budgets</RouterLink>
      </div>
      <ul v-if="alerts.length" class="divide-y divide-gray-100">
        <li v-for="alert in alerts" :key="alert.categoryId" class="py-2 flex items-center justify-between gap-3">
          <span class="font-medium">{{ alert.category }}</span>
          <span :class="alert.overBudget ? 'text-red-600' : 'text-amber-600'">{{ alert.percent.toFixed(0) }}% used</span>
        </li>
      </ul>
      <p v-else class="text-sm text-gray-500">No budget alerts for {{ store.budgetMonthLabel }}.</p>
    </section>

    <section class="bg-white rounded-lg shadow p-4 space-y-4">
      <div>
        <p class="text-xs uppercase tracking-wide text-gray-500">Month over Month</p>
        <h3 class="font-semibold">Budget vs actual per category</h3>
      </div>

      <p v-if="store.budgetHistoryLoading" class="text-sm text-gray-500">Loading budget history...</p>
      <p v-else-if="budgetVsActual.length === 0" class="text-sm text-gray-500">
        No monthly budgets yet. Set limits in the Budget Planner to track budget vs actual here.
      </p>

      <div v-for="group in budgetVsActual" :key="group.month" class="space-y-2">
        <h4 class="text-sm font-semibold text-gray-700">{{ group.label }}</h4>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
                <th class="py-2 pr-3 font-medium">Category</th>
                <th class="py-2 pr-3 font-medium text-right">Budget</th>
                <th class="py-2 pr-3 font-medium text-right">Actual</th>
                <th class="py-2 pr-3 font-medium text-right">Remaining</th>
                <th class="py-2 font-medium text-right">Used</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="row in group.rows" :key="row.categoryId">
                <td class="py-2 pr-3 font-medium">{{ row.category }}</td>
                <td class="py-2 pr-3 text-right">{{ store.formatCurrency(row.budget) }}</td>
                <td class="py-2 pr-3 text-right">{{ store.formatCurrency(row.actual) }}</td>
                <td class="py-2 pr-3 text-right" :class="row.overBudget ? 'text-red-600' : 'text-gray-700'">
                  {{ store.formatCurrency(row.budget - row.actual) }}
                </td>
                <td class="py-2 text-right font-semibold" :class="row.overBudget ? 'text-red-600' : row.percent >= 80 ? 'text-amber-600' : 'text-gray-700'">
                  {{ row.percent.toFixed(0) }}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="bg-white rounded-lg shadow p-4">
        <Charts type="pie" />
      </div>
      <div class="bg-white rounded-lg shadow p-4">
        <Charts type="bar" />
      </div>
    </div>
  </div>
</template>
