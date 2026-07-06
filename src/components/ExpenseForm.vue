<script setup>
import { reactive, watch } from 'vue'
import { useTransactionsStore } from '../store/transactions'

const props = defineProps({
  initial: { type: Object, default: null },
  submitting: { type: Boolean, default: false },
})
const emit = defineEmits(['submit'])

const store = useTransactionsStore()

const state = reactive({
  description: '',
  categoryId: '',
  type: 'expense',
  amount: '',
  date: new Date().toISOString().slice(0, 10),
  errors: {},
})

watch(
  () => props.initial,
  (val) => {
    state.description = val?.description || ''
    state.categoryId = val?.categoryId || ''
    state.type = val?.type || 'expense'
    state.amount = val?.amount ?? ''
    state.date = val?.date || new Date().toISOString().slice(0, 10)
    state.errors = {}
  },
  { immediate: true }
)

function submitForm() {
  const payload = {
    description: String(state.description).trim(),
    categoryId: state.categoryId,
    type: state.type,
    amount: Number(state.amount),
    date: state.date,
  }
  const errors = store.validate(payload)
  state.errors = errors
  if (Object.keys(errors).length === 0) emit('submit', payload)
}
</script>

<template>
  <form @submit.prevent="submitForm" class="space-y-4">
    <div>
      <span class="block text-sm font-medium mb-1">Type</span>
      <div class="inline-flex rounded-md border border-gray-300 overflow-hidden">
        <button
          type="button"
          class="px-4 py-2 text-sm"
          :class="state.type === 'expense' ? 'bg-primary text-white' : 'bg-white hover:bg-gray-100'"
          @click="state.type = 'expense'"
        >
          Expense
        </button>
        <button
          type="button"
          class="px-4 py-2 text-sm border-l border-gray-300"
          :class="state.type === 'income' ? 'bg-green-600 text-white' : 'bg-white hover:bg-gray-100'"
          @click="state.type = 'income'"
        >
          Income
        </button>
      </div>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium mb-1">Description</label>
        <input v-model="state.description" type="text" class="w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary" placeholder="e.g., Lunch at cafe" />
        <p v-if="state.errors.description" class="text-sm text-red-600 mt-1">{{ state.errors.description }}</p>
      </div>
      <div>
        <label class="block text-sm font-medium mb-1">Category</label>
        <select v-model="state.categoryId" class="w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary">
          <option value="" disabled>Select</option>
          <option v-for="c in store.categories" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
        <p v-if="state.errors.categoryId" class="text-sm text-red-600 mt-1">{{ state.errors.categoryId }}</p>
      </div>
      <div>
        <label class="block text-sm font-medium mb-1">Amount</label>
        <input v-model.number="state.amount" type="number" step="0.01" min="0" class="w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary" :placeholder="store.formatCurrency(0).replace(/\d+[.,]?\d*/, '0.00')" />
        <p v-if="state.errors.amount" class="text-sm text-red-600 mt-1">{{ state.errors.amount }}</p>
      </div>
      <div>
        <label class="block text-sm font-medium mb-1">Date</label>
        <input v-model="state.date" type="date" class="w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary" />
        <p v-if="state.errors.date" class="text-sm text-red-600 mt-1">{{ state.errors.date }}</p>
      </div>
    </div>
    <div class="flex justify-end">
      <button
        type="submit"
        class="px-4 py-2 rounded-md bg-primary text-white hover:opacity-90 transition disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="props.submitting"
      >
        {{ props.submitting ? 'Saving...' : 'Save' }}
      </button>
    </div>
  </form>
</template>
