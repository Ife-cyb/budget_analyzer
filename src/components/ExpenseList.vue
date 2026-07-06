<script setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../store/auth'
import { useTransactionsStore } from '../store/transactions'
import { useWorkspaceStore } from '../store/workspace'

const props = defineProps({
  transactions: { type: Array, required: true },
  title: { type: String, default: 'Transactions' },
  showHeader: { type: Boolean, default: false },
})
const emit = defineEmits(['edit'])

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const store = useTransactionsStore()
const workspaceStore = useWorkspaceStore()

const formatted = computed(() => props.transactions.map(t => ({
  ...t,
  dateFormatted: t.date,
  amountFormatted: `${t.type === 'income' ? '+' : ''}${store.formatCurrency(Number(t.amount))}`,
  addedBy: workspaceStore.isTeamWorkspace ? workspaceStore.memberName(t.createdBy) : '',
})))

// UI convenience only — RLS enforces this server-side.
function canModify(t) {
  return workspaceStore.canManage
    || (workspaceStore.canWrite && t.createdBy === authStore.user?.id)
}

async function onDelete(id) {
  try {
    await store.removeTransaction(id)
  } catch {
    // Store-level error state is rendered by parent views.
  }
}

function isDeleting(id) {
  return store.deletingIds.includes(id)
}

function editAction(t) {
  // If not on Add page, navigate to Add with id; otherwise emit to parent
  if (route.name !== 'AddExpense' && route.name !== 'EditExpense') {
    router.push(`/add/${t.id}`)
  } else {
    emit('edit', t)
  }
}
</script>

<template>
  <div>
    <div v-if="showHeader" class="flex items-center justify-between mb-2">
      <h3 class="font-semibold">{{ title }}</h3>
      <RouterLink v-if="workspaceStore.canWrite" to="/add" class="text-sm text-primary">Add</RouterLink>
    </div>
    <p v-if="formatted.length === 0" class="py-6 text-center text-sm text-gray-500">
      No transactions yet.
    </p>
    <transition-group v-else name="list" tag="ul" class="divide-y divide-gray-200">
      <li v-for="t in formatted" :key="t.id" class="flex items-center justify-between py-3">
        <div class="min-w-0">
          <p class="font-medium truncate">{{ t.description }}</p>
          <p class="text-sm text-gray-500">
            {{ t.category }} • {{ t.dateFormatted }}<template v-if="t.addedBy"> • added by {{ t.addedBy }}</template>
          </p>
        </div>
        <div class="flex items-center gap-3">
          <span class="font-semibold" :class="t.type === 'income' ? 'text-green-600' : ''">{{ t.amountFormatted }}</span>
          <template v-if="canModify(t)">
            <button @click="editAction(t)" class="text-sm text-blue-600 hover:underline">Edit</button>
            <button
              @click="onDelete(t.id)"
              class="text-sm text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="isDeleting(t.id)"
            >
              {{ isDeleting(t.id) ? 'Deleting...' : 'Delete' }}
            </button>
          </template>
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
