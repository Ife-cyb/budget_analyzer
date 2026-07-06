<script setup>
import { onMounted, ref, computed } from 'vue'
import { useTransactionsStore } from '../store/transactions'
import SummaryCards from '../components/SummaryCards.vue'
import ExpenseList from '../components/ExpenseList.vue'
import Charts from '../components/Charts.vue'
import BudgetPlanner from '../components/BudgetPlanner.vue'

const store = useTransactionsStore()
const selectedCategory = ref('All')
const selectedMonth = ref('All')

onMounted(async () => {
  try {
    await store.init()
  } finally {
    selectedCategory.value = store.filters.category
    selectedMonth.value = store.filters.month
  }
})

const categories = computed(() => ['All', ...store.categoryNames])
const months = computed(() => store.monthsAvailable)

function applyFilters() {
  store.setFilterCategory(selectedCategory.value)
  store.setFilterMonth(selectedMonth.value)
}
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 py-6 space-y-6">
    <h1 class="text-2xl font-semibold">Dashboard</h1>

    <p v-if="store.loading" class="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-700">
      Loading your budget data...
    </p>

    <p v-if="store.error" class="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      {{ store.error }}
    </p>

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
        <ExpenseList :transactions="store.filteredTransactions.slice(0, 8)" showHeader title="Recent Transactions" />
      </div>
      <div class="space-y-4">
        <BudgetPlanner />
        <Charts type="pie" />
        <Charts type="bar" />
      </div>
    </section>
  </div>
</template>
