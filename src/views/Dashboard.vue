<script setup>
import { onMounted, ref, computed } from 'vue'
import { useExpensesStore } from '../store/expenses'
import SummaryCards from '../components/SummaryCards.vue'
import ExpenseList from '../components/ExpenseList.vue'
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

function applyFilters() {
  store.setFilterCategory(selectedCategory.value)
  store.setFilterMonth(selectedMonth.value)
}
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 py-6 space-y-6">
    <header class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <h1 class="text-2xl font-semibold">Budget Analyzer</h1>
      <nav class="flex gap-2">
        <RouterLink to="/" class="px-3 py-2 rounded-md bg-primary text-white">Dashboard</RouterLink>
        <RouterLink to="/add" class="px-3 py-2 rounded-md bg-gray-200">Add Expense</RouterLink>
        <RouterLink to="/reports" class="px-3 py-2 rounded-md bg-gray-200">Reports</RouterLink>
      </nav>
    </header>

    <section>
      <SummaryCards />
    </section>

    <section class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2 space-y-4">
        <div class="flex flex-col sm:flex-row gap-3">
          <select v-model="selectedCategory" @change="applyFilters" class="px-3 py-2 rounded-md border border-gray-300 bg-white">
            <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
          </select>
          <select v-model="selectedMonth" @change="applyFilters" class="px-3 py-2 rounded-md border border-gray-300 bg-white">
            <option v-for="m in months" :key="m" :value="m">{{ m }}</option>
          </select>
        </div>
        <ExpenseList :expenses="store.filteredExpenses.slice(0, 8)" showHeader title="Recent Transactions" />
      </div>
      <div class="space-y-4">
        <Charts type="pie" />
        <Charts type="bar" />
      </div>
    </section>
  </div>
</template> 