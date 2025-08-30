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

onMounted(() => {
  store.init()
  loadFromRoute()
})

watch(() => route.params.id, () => loadFromRoute())

function onSubmit(values) {
  if (editingId.value) {
    store.updateExpense(editingId.value, values)
    router.push('/')
  } else {
    store.addExpense(values)
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

    <div class="bg-white rounded-lg shadow p-4">
      <ExpenseForm :initial="formInitial" @submit="onSubmit" />
    </div>

    <div class="bg-white rounded-lg shadow p-4">
      <ExpenseList :expenses="store.filteredExpenses" @edit="onEdit" />
    </div>
  </div>
</template> 