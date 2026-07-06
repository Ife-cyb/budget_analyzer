<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useTransactionsStore } from '../store/transactions'
import { useWorkspaceStore } from '../store/workspace'

const store = useTransactionsStore()
const workspaceStore = useWorkspaceStore()

const form = reactive({
  categoryId: store.categories[0]?.id || '',
  amount: '',
})
const copyNotice = ref('')

watch(
  () => store.categories,
  (categories) => {
    if (!categories.some((c) => c.id === form.categoryId)) {
      form.categoryId = categories[0]?.id || ''
    }
  }
)

const budgetRows = computed(() => store.budgetProgress)
const hasBudgets = computed(() => budgetRows.value.length > 0)
const pickerMonth = computed(() => store.budgetMonth.slice(0, 7))

function onMonthChange(event) {
  copyNotice.value = ''
  store.setBudgetMonth(event.target.value).catch(() => {})
}

async function copyFromPreviousMonth() {
  copyNotice.value = ''
  try {
    const count = await store.copyBudgetsFromPreviousMonth()
    copyNotice.value = `Copied ${count} budget${count === 1 ? '' : 's'} into ${store.budgetMonthLabel}. Existing limits were kept.`
  } catch {
    // Store-level error state is rendered below.
  }
}

async function saveBudget() {
  const amount = Number(form.amount)
  if (!form.categoryId || Number.isNaN(amount) || amount < 0) return
  try {
    await store.setBudget(form.categoryId, amount)
    form.amount = ''
  } catch {
    // Store-level error state is rendered below.
  }
}

async function removeBudget(categoryId) {
  try {
    await store.removeBudget(categoryId)
  } catch {
    // Store-level error state is rendered below.
  }
}

function isRemoving(categoryId) {
  return store.deletingBudgets.includes(categoryId)
}
</script>

<template>
  <section class="bg-white rounded-lg shadow p-4 space-y-4">
    <div class="flex flex-col gap-1">
      <p class="text-xs uppercase tracking-wide text-gray-500">Monthly Budget Planner</p>
      <h3 class="text-lg font-semibold">Budgets — {{ store.budgetMonthLabel }}</h3>
      <p class="text-sm text-gray-500">Progress counts expense transactions in the selected month, regardless of dashboard filters.</p>
    </div>

    <div class="flex flex-wrap items-center gap-3">
      <label class="sr-only" for="budget-month">Budget month</label>
      <input
        id="budget-month"
        type="month"
        :value="pickerMonth"
        class="px-3 py-2 rounded-md border border-gray-300 bg-white text-sm disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="store.budgetsLoading"
        @change="onMonthChange"
      />
      <button
        v-if="workspaceStore.canManage"
        type="button"
        class="px-3 py-2 rounded-md border border-gray-300 text-sm hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="store.budgetSaving || store.budgetsLoading"
        @click="copyFromPreviousMonth"
      >
        Copy from previous month
      </button>
    </div>

    <p v-if="copyNotice" class="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
      {{ copyNotice }}
    </p>

    <form
      v-if="workspaceStore.canManage"
      class="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3"
      @submit.prevent="saveBudget"
    >
      <label class="sr-only" for="budget-category">Budget category</label>
      <select id="budget-category" v-model="form.categoryId" class="px-3 py-2 rounded-md border border-gray-300 bg-white">
        <option v-for="category in store.categories" :key="category.id" :value="category.id">{{ category.name }}</option>
      </select>

      <label class="sr-only" for="budget-amount">Budget amount</label>
      <input id="budget-amount" v-model.number="form.amount" type="number" min="0" step="0.01" class="px-3 py-2 rounded-md border border-gray-300" placeholder="Monthly limit" />

      <button
        type="submit"
        class="px-4 py-2 rounded-md bg-primary text-white hover:opacity-90 transition disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="store.budgetSaving"
      >
        {{ store.budgetSaving ? 'Saving...' : 'Save Budget' }}
      </button>
    </form>
    <p v-else class="text-sm text-gray-500">Only workspace admins can manage budgets.</p>

    <p v-if="store.error" class="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      {{ store.error }}
    </p>

    <p v-if="store.budgetsLoading" class="text-sm text-gray-500">Loading budgets...</p>

    <div v-if="hasBudgets" class="space-y-3">
      <div v-for="row in budgetRows" :key="row.categoryId" class="space-y-1.5">
        <div class="flex items-center justify-between gap-3 text-sm">
          <div>
            <p class="font-medium">{{ row.category }}</p>
            <p class="text-gray-500">{{ store.formatCurrency(row.spent) }} of {{ store.formatCurrency(row.limit) }}</p>
          </div>
          <div class="flex items-center gap-3">
            <span class="font-semibold" :class="row.overBudget ? 'text-red-600' : 'text-gray-700'">{{ row.percent.toFixed(0) }}%</span>
            <button
              v-if="workspaceStore.canManage"
              type="button"
              class="text-xs text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="isRemoving(row.categoryId)"
              @click="removeBudget(row.categoryId)"
            >
              {{ isRemoving(row.categoryId) ? 'Removing...' : 'Remove' }}
            </button>
          </div>
        </div>
        <div class="h-2 rounded-full bg-gray-100 overflow-hidden">
          <div class="h-full rounded-full transition-all" :class="row.overBudget ? 'bg-red-500' : row.percent >= 80 ? 'bg-amber-500' : 'bg-green-500'" :style="{ width: `${Math.min(row.percent, 100)}%` }"></div>
        </div>
        <p v-if="row.overBudget" class="text-xs text-red-600">Over budget by {{ store.formatCurrency(row.spent - row.limit) }}.</p>
      </div>
    </div>

    <p v-else-if="!store.budgetsLoading" class="text-sm text-gray-500">
      No budgets for {{ store.budgetMonthLabel }}. Add category limits or copy last month's.
    </p>
  </section>
</template>
