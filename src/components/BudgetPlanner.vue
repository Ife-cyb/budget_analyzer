<script setup>
import { computed, reactive } from 'vue'
import { useExpensesStore } from '../store/expenses'

const store = useExpensesStore()

const form = reactive({
  category: store.categories[0] || 'Food',
  amount: '',
})

const budgetRows = computed(() => store.budgetProgress)
const hasBudgets = computed(() => budgetRows.value.length > 0)

function saveBudget() {
  const amount = Number(form.amount)
  if (!form.category || Number.isNaN(amount) || amount < 0) return
  store.setBudget(form.category, amount)
  form.amount = ''
}

function removeBudget(category) {
  store.removeBudget(category)
}
</script>

<template>
  <section class="bg-white rounded-lg shadow p-4 space-y-4">
    <div class="flex flex-col gap-1">
      <p class="text-xs uppercase tracking-wide text-gray-500">Monthly Budget Planner</p>
      <h3 class="text-lg font-semibold">Stay ahead of category spending</h3>
      <p class="text-sm text-gray-500">Budgets apply to the currently selected month. Choose a month filter to inspect previous periods.</p>
    </div>

    <form class="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3" @submit.prevent="saveBudget">
      <label class="sr-only" for="budget-category">Budget category</label>
      <select id="budget-category" v-model="form.category" class="px-3 py-2 rounded-md border border-gray-300 bg-white">
        <option v-for="category in store.categories" :key="category" :value="category">{{ category }}</option>
      </select>

      <label class="sr-only" for="budget-amount">Budget amount</label>
      <input id="budget-amount" v-model.number="form.amount" type="number" min="0" step="0.01" class="px-3 py-2 rounded-md border border-gray-300" placeholder="Monthly limit" />

      <button type="submit" class="px-4 py-2 rounded-md bg-primary text-white hover:opacity-90 transition">Save Budget</button>
    </form>

    <div v-if="hasBudgets" class="space-y-3">
      <div v-for="row in budgetRows" :key="row.category" class="space-y-1.5">
        <div class="flex items-center justify-between gap-3 text-sm">
          <div>
            <p class="font-medium">{{ row.category }}</p>
            <p class="text-gray-500">{{ store.formatCurrency(row.spent) }} of {{ store.formatCurrency(row.limit) }}</p>
          </div>
          <div class="flex items-center gap-3">
            <span class="font-semibold" :class="row.overBudget ? 'text-red-600' : 'text-gray-700'">{{ row.percent.toFixed(0) }}%</span>
            <button type="button" class="text-xs text-red-600 hover:underline" @click="removeBudget(row.category)">Remove</button>
          </div>
        </div>
        <div class="h-2 rounded-full bg-gray-100 overflow-hidden">
          <div class="h-full rounded-full transition-all" :class="row.overBudget ? 'bg-red-500' : row.percent >= 80 ? 'bg-amber-500' : 'bg-green-500'" :style="{ width: `${Math.min(row.percent, 100)}%` }"></div>
        </div>
        <p v-if="row.overBudget" class="text-xs text-red-600">Over budget by {{ store.formatCurrency(row.spent - row.limit) }}.</p>
      </div>
    </div>

    <p v-else class="text-sm text-gray-500">No budgets yet. Add category limits to unlock progress tracking and alerts.</p>
  </section>
</template>
