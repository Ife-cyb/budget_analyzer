<script setup>
import { ref, computed, onMounted } from 'vue'
import { useExpensesStore } from '../store/expenses'
import Charts from '../components/Charts.vue'

const store = useExpensesStore()
const selectedCategory = ref('All')
const selectedMonth = ref('All')

onMounted(() => {
  store.init()
  selectedCategory.value = store.filters.category
  selectedMonth.value = store.filters.month
})

const categories = computed(() => ['All', ...store.categories])
const months = computed(() => store.monthsAvailable)
const alerts = computed(() => store.budgetAlerts)

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
          <h3 class="font-semibold">Categories near or above budget</h3>
        </div>
        <RouterLink to="/" class="text-sm text-primary">Manage budgets</RouterLink>
      </div>
      <ul v-if="alerts.length" class="divide-y divide-gray-100">
        <li v-for="alert in alerts" :key="alert.category" class="py-2 flex items-center justify-between gap-3">
          <span class="font-medium">{{ alert.category }}</span>
          <span :class="alert.overBudget ? 'text-red-600' : 'text-amber-600'">{{ alert.percent.toFixed(0) }}% used</span>
        </li>
      </ul>
      <p v-else class="text-sm text-gray-500">No budget alerts for the selected filters.</p>
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