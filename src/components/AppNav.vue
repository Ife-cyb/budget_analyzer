<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useExpensesStore } from '../store/expenses'

const store = useExpensesStore()
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

const links = [
  { to: '/', label: 'Dashboard', names: ['Dashboard'] },
  { to: '/add', label: 'Add Transaction', names: ['AddExpense', 'EditExpense'] },
  { to: '/reports', label: 'Reports', names: ['Reports'] },
  { to: '/logout', label: 'Logout', names: ['Logout'] },
]

function linkClass(link) {
  return link.names.includes(route.name)
    ? 'px-3 py-1.5 rounded-md bg-primary text-white'
    : 'px-3 py-1.5 rounded-md hover:bg-gray-100'
}
</script>

<template>
  <header class="bg-white border-b">
    <div class="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
      <RouterLink to="/" class="text-lg font-semibold">Budget Analyzer</RouterLink>
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
        <nav class="flex gap-2">
          <RouterLink v-for="link in links" :key="link.to" :to="link.to" :class="linkClass(link)">
            {{ link.label }}
          </RouterLink>
        </nav>
      </div>
    </div>
  </header>
</template>
