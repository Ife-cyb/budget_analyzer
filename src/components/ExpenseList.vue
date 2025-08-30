<script setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useExpensesStore } from '../store/expenses'

const props = defineProps({
  expenses: { type: Array, required: true },
  title: { type: String, default: 'Expenses' },
  showHeader: { type: Boolean, default: false },
})
const emit = defineEmits(['edit'])

const router = useRouter()
const route = useRoute()
const store = useExpensesStore()

const formatted = computed(() => props.expenses.map(e => ({
  ...e,
  dateFormatted: e.date,
  amountFormatted: useExpensesStore().formatCurrency(Number(e.amount)),
})))

function onDelete(id) {
  store.removeExpense(id)
}

function editAction(e) {
  // If not on Add page, navigate to Add with id; otherwise emit to parent
  if (route.name !== 'AddExpense' && route.name !== 'EditExpense') {
    router.push(`/add/${e.id}`)
  } else {
    emit('edit', e)
  }
}
</script>

<template>
  <div>
    <div v-if="showHeader" class="flex items-center justify-between mb-2">
      <h3 class="font-semibold">{{ title }}</h3>
      <RouterLink to="/add" class="text-sm text-primary">Add</RouterLink>
    </div>
    <transition-group name="list" tag="ul" class="divide-y divide-gray-200">
      <li v-for="e in formatted" :key="e.id" class="flex items-center justify-between py-3">
        <div class="min-w-0">
          <p class="font-medium truncate">{{ e.description }}</p>
          <p class="text-sm text-gray-500">{{ e.category }} • {{ e.dateFormatted }}</p>
        </div>
        <div class="flex items-center gap-3">
          <span class="font-semibold">{{ e.amountFormatted }}</span>
          <button @click="editAction(e)" class="text-sm text-blue-600 hover:underline">Edit</button>
          <button @click="onDelete(e.id)" class="text-sm text-red-600 hover:underline">Delete</button>
        </div>
      </li>
    </transition-group>
  </div>
</template>

<style scoped>
.list-enter-active, .list-leave-active {
  transition: all 0.2s ease;
}
.list-enter-from, .list-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
</style> 