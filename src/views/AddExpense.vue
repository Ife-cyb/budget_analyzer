<script setup>
import { ref, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ExpenseForm from '../components/ExpenseForm.vue'
import ExpenseList from '../components/ExpenseList.vue'
import { useTransactionsStore } from '../store/transactions'
import { useWorkspaceStore } from '../store/workspace'

const store = useTransactionsStore()
const workspaceStore = useWorkspaceStore()
const route = useRoute()
const router = useRouter()

const editingId = ref(null)
const formInitial = ref(null)
const submitting = ref(false)
const formError = ref('')

function loadFromRoute() {
  const id = route.params.id
  if (id) {
    const t = store.transactions.find((x) => x.id === id)
    if (t) {
      editingId.value = t.id
      formInitial.value = {
        description: t.description,
        categoryId: t.categoryId,
        type: t.type,
        amount: t.amount,
        date: t.date,
      }
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
      await store.updateTransaction(editingId.value, values)
      router.push('/')
    } else {
      await store.addTransaction(values)
    }
  } catch (error) {
    formError.value = error?.message || store.error || 'Unable to save transaction.'
  } finally {
    submitting.value = false
  }
}

function onEdit(transaction) {
  router.push(`/add/${transaction.id}`)
}
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 py-6 space-y-6">
    <header class="flex items-center justify-between">
      <h2 class="text-xl font-semibold">{{ editingId ? 'Edit Transaction' : 'Add Transaction' }}</h2>
      <RouterLink to="/" class="text-primary">Back to Dashboard</RouterLink>
    </header>

    <p v-if="store.loading" class="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-700">
      Loading your budget data...
    </p>

    <p v-if="formError || store.error" class="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      {{ formError || store.error }}
    </p>

    <div v-if="workspaceStore.canWrite" class="bg-white rounded-lg shadow p-4">
      <ExpenseForm :initial="formInitial" :submitting="submitting || store.saving" @submit="onSubmit" />
    </div>
    <p v-else class="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
      You have view-only access in this workspace.
    </p>

    <div class="bg-white rounded-lg shadow p-4">
      <ExpenseList :transactions="store.filteredTransactions" @edit="onEdit" />
    </div>
  </div>
</template>
