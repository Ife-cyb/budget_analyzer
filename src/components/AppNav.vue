<script setup>
import { computed, reactive } from 'vue'
import { useRoute } from 'vue-router'
import { useTransactionsStore } from '../store/transactions'
import { useWorkspaceStore } from '../store/workspace'

const store = useTransactionsStore()
const workspaceStore = useWorkspaceStore()
const route = useRoute()

const currencies = [
  { code: 'USD', label: 'US Dollar' },
  { code: 'NGN', label: 'Naira' },
  { code: 'GBP', label: 'Pound' },
]
const selectedCurrency = computed({
  get() { return store.settings.currency },
  set(v) { store.setCurrency(v).catch(() => {}) },
})

const selectedWorkspace = computed({
  get() { return workspaceStore.activeWorkspaceId },
  set(id) { workspaceStore.setActiveWorkspace(id).catch(() => {}) },
})

const links = [
  { to: '/', label: 'Dashboard', names: ['Dashboard'] },
  { to: '/add', label: 'Add Transaction', names: ['AddExpense', 'EditExpense'] },
  { to: '/reports', label: 'Reports', names: ['Reports'] },
  { to: '/categories', label: 'Categories', names: ['Categories'] },
  { to: '/logout', label: 'Logout', names: ['Logout'] },
]

function linkClass(link) {
  return link.names.includes(route.name)
    ? 'px-3 py-1.5 rounded-md bg-primary text-white'
    : 'px-3 py-1.5 rounded-md hover:bg-gray-100'
}

const modal = reactive({
  open: false,
  name: '',
  error: '',
})

function openModal() {
  modal.open = true
  modal.name = ''
  modal.error = ''
}

function closeModal() {
  if (workspaceStore.creating) return
  modal.open = false
}

async function createTeam() {
  modal.error = ''
  try {
    await workspaceStore.createTeamWorkspace(modal.name)
    modal.open = false
  } catch (error) {
    modal.error = error?.message || 'Unable to create workspace.'
  }
}
</script>

<template>
  <header class="bg-white border-b">
    <div class="max-w-7xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <RouterLink to="/" class="text-lg font-semibold">Budget Analyzer</RouterLink>
        <label for="workspace" class="sr-only">Workspace</label>
        <select
          id="workspace"
          v-model="selectedWorkspace"
          class="max-w-44 px-2 py-1.5 rounded-md border border-gray-300 bg-white text-sm disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="workspaceStore.loading || store.loading"
        >
          <option v-for="w in workspaceStore.workspaces" :key="w.id" :value="w.id">
            {{ w.name }}{{ w.type === 'team' ? ' (team)' : '' }}
          </option>
        </select>
        <button
          type="button"
          class="px-2 py-1.5 rounded-md border border-gray-300 text-sm hover:bg-gray-100"
          title="New team workspace"
          @click="openModal"
        >
          + Team
        </button>
      </div>
      <div class="flex items-center gap-2">
        <label for="currency" class="sr-only">Currency</label>
        <select
          id="currency"
          v-model="selectedCurrency"
          class="px-2 py-1.5 rounded-md border border-gray-300 bg-white text-sm disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="store.settingsSaving"
        >
          <option v-for="c in currencies" :key="c.code" :value="c.code">{{ c.code }}</option>
        </select>
        <nav class="flex flex-wrap gap-2">
          <RouterLink v-for="link in links" :key="link.to" :to="link.to" :class="linkClass(link)">
            {{ link.label }}
          </RouterLink>
        </nav>
      </div>
    </div>
  </header>

  <Teleport to="body">
    <div
      v-if="modal.open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      @click.self="closeModal"
    >
      <div class="w-full max-w-sm rounded-lg bg-white p-5 shadow-lg space-y-4">
        <h3 class="text-lg font-semibold">New team workspace</h3>
        <form class="space-y-3" @submit.prevent="createTeam">
          <div>
            <label for="team-name" class="block text-sm font-medium mb-1">Name</label>
            <input
              id="team-name"
              v-model="modal.name"
              type="text"
              class="w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g., Family, Marketing team"
              autocomplete="off"
            />
          </div>
          <p v-if="modal.error" class="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {{ modal.error }}
          </p>
          <div class="flex justify-end gap-2">
            <button
              type="button"
              class="px-3 py-2 rounded-md border border-gray-300 hover:bg-gray-100"
              :disabled="workspaceStore.creating"
              @click="closeModal"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="px-4 py-2 rounded-md bg-primary text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="workspaceStore.creating"
            >
              {{ workspaceStore.creating ? 'Creating...' : 'Create' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>
