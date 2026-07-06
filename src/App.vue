<script setup>
import { computed } from 'vue'
import { useExpensesStore } from './store/expenses'
import { useAuthStore } from './store/auth'

const store = useExpensesStore()
const authStore = useAuthStore()
const currencies = [
  { code: 'USD', label: 'US Dollar' },
  { code: 'NGN', label: 'Naira' },
  { code: 'GBP', label: 'Pound' },
]
const selectedCurrency = computed({
  get() { return store.settings.currency },
  set(v) { store.setCurrency(v).catch(() => {}) },
})
</script>

<template>
  <div>
    <header class="bg-white border-b">
      <div class="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
        <RouterLink to="/" class="text-lg font-semibold">Budget Analyzer</RouterLink>
        <div class="flex items-center gap-2">
          <label v-if="authStore.isAuthenticated" for="currency" class="sr-only">Currency</label>
          <select
            v-if="authStore.isAuthenticated"
            id="currency"
            v-model="selectedCurrency"
            class="px-2 py-1.5 rounded-md border border-gray-300 bg-white text-sm disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="store.settingsSaving"
          >
            <option v-for="c in currencies" :key="c.code" :value="c.code">{{ c.code }}</option>
          </select>
          <nav v-if="authStore.isAuthenticated" class="flex gap-2">
            <RouterLink to="/" class="px-3 py-1.5 rounded-md hover:bg-gray-100">Dashboard</RouterLink>
            <RouterLink to="/add" class="px-3 py-1.5 rounded-md hover:bg-gray-100">Add</RouterLink>
            <RouterLink to="/reports" class="px-3 py-1.5 rounded-md hover:bg-gray-100">Reports</RouterLink>
            <RouterLink to="/logout" class="px-3 py-1.5 rounded-md hover:bg-gray-100">Logout</RouterLink>
          </nav>
          <nav v-else class="flex gap-2">
            <RouterLink to="/login" class="px-3 py-1.5 rounded-md hover:bg-gray-100">Login</RouterLink>
            <RouterLink to="/register" class="px-3 py-1.5 rounded-md bg-primary text-white hover:opacity-90">Register</RouterLink>
          </nav>
        </div>
      </div>
    </header>
    <main>
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
</style>
