<script setup>
import { ref, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ExpenseForm from '../components/ExpenseForm.vue'
import ExpenseList from '../components/ExpenseList.vue'
import { useExpensesStore } from '../store/expenses'

const store = useExpensesStore()
const route = useRoute()
const router = useRouter()

const editingId = ref(null)
const formInitial = ref(null)
const submitting = ref(false)
const formError = ref('')

function loadFromRoute() {
  const id = route.params.id
  if (id) {
    const e = store.expenses.find((x) => x.id === id)
    if (e) {
      editingId.value = e.id
      formInitial.value = { description: e.description, category: e.category, amount: e.amount, date: e.date }
    }
  } else {
    editingId.value = null
    formInitial.value = null
  }
}

onMounted(async () => {
  try {
    await store.init()
  } finally {
    loadFromRoute()
  }
})

watch(() => route.params.id, () => loadFromRoute())

async function onSubmit(values) {
  submitting.value = true
  formError.value = ''

  try {
    if (editingId.value) {
      await store.updateExpense(editingId.value, values)
      router.push('/')
    } else {
      await store.addExpense(values)
    }
  } catch (error) {
    formError.value = error?.message || store.error || 'Unable to save expense.'
  } finally {
    submitting.value = false
  }
}

function onEdit(expense) {
  router.push(`/add/${expense.id}`)
}
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 py-6 space-y-6">
    <header class="flex items-center justify-between">
      <h2 class="text-xl font-semibold">{{ editingId ? 'Edit Expense' : 'Add Expense' }}</h2>
      <RouterLink to="/" class="text-primary">Back to Dashboard</RouterLink>
    </header>

    <p v-if="store.loading" class="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-700">
      Loading your budget data...
    </p>

    <p v-if="formError || store.error" class="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      {{ formError || store.error }}
    </p>

    <div class="bg-white rounded-lg shadow p-4">
      <ExpenseForm :initial="formInitial" :submitting="submitting || store.saving" @submit="onSubmit" />
    </div>

    <div class="bg-white rounded-lg shadow p-4">
      <ExpenseList :expenses="store.filteredExpenses" @edit="onEdit" />
    </div>
  </div>
</template>
