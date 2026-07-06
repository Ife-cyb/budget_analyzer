<script setup>
import { computed } from 'vue'
import { useTransactionsStore } from '../store/transactions'

const store = useTransactionsStore()

const income = computed(() => store.totalIncome)
const expenses = computed(() => store.totalSpent)
const net = computed(() => store.netCashFlow)
const topCategory = computed(() => store.topCategory)
const count = computed(() => store.filteredTransactions.length)

const mom = computed(() => {
  const series = store.monthlySeries
  const len = series.length
  if (len < 2) return null
  const [prevMonth, prevVal] = series[len - 2]
  const [currMonth, currVal] = series[len - 1]
  const diff = currVal - prevVal
  const pct = prevVal === 0 ? null : (diff / prevVal) * 100
  return { prevMonth, currMonth, diff, pct }
})
</script>

<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    <div class="bg-white rounded-lg shadow p-4 min-w-0">
      <p class="text-xs uppercase tracking-wide text-gray-500">Income</p>
      <p class="mt-2 text-2xl font-semibold truncate text-green-600">{{ store.formatCurrency(income) }}</p>
    </div>
    <div class="bg-white rounded-lg shadow p-4 min-w-0">
      <p class="text-xs uppercase tracking-wide text-gray-500">Expenses</p>
      <p class="mt-2 text-2xl font-semibold truncate">{{ store.formatCurrency(expenses) }}</p>
    </div>
    <div class="bg-white rounded-lg shadow p-4 min-w-0">
      <p class="text-xs uppercase tracking-wide text-gray-500">Net Cash Flow</p>
      <p class="mt-2 text-2xl font-semibold truncate" :class="net >= 0 ? 'text-green-600' : 'text-red-600'">
        {{ store.formatCurrency(net) }}
      </p>
    </div>
    <div class="bg-white rounded-lg shadow p-4 min-w-0">
      <p class="text-xs uppercase tracking-wide text-gray-500">Top Category</p>
      <p class="mt-2 text-2xl font-semibold truncate">{{ topCategory ? topCategory.category : '—' }}</p>
      <p v-if="topCategory" class="mt-1 text-sm text-gray-500 truncate">{{ store.formatCurrency(topCategory.amount) }}</p>
    </div>
    <div class="bg-white rounded-lg shadow p-4 min-w-0">
      <p class="text-xs uppercase tracking-wide text-gray-500">Transactions</p>
      <p class="mt-2 text-2xl font-semibold">{{ count }}</p>
    </div>
    <div class="bg-white rounded-lg shadow p-4 min-w-0">
      <p class="text-xs uppercase tracking-wide text-gray-500">MoM Spending</p>
      <div v-if="mom" class="mt-2 flex items-baseline gap-2 min-w-0">
        <p class="text-2xl font-semibold truncate" :class="mom.diff >= 0 ? 'text-red-600' : 'text-green-600'">
          {{ mom.diff >= 0 ? '+' : '' }}{{ store.formatCurrency(mom.diff) }}
        </p>
        <p class="text-sm text-gray-500 whitespace-nowrap">{{ mom.currMonth }} vs {{ mom.prevMonth }}</p>
        <p v-if="mom.pct !== null" class="text-sm whitespace-nowrap" :class="mom.diff >= 0 ? 'text-red-600' : 'text-green-600'">
          ({{ mom.diff >= 0 ? '+' : '' }}{{ mom.pct.toFixed(1) }}%)
        </p>
      </div>
      <p v-else class="mt-2 text-sm text-gray-500">Insufficient data</p>
    </div>
  </div>
</template>
