<script setup>
import { useRoute } from 'vue-router'
import { useAuthStore } from './store/auth'
import AppNav from './components/AppNav.vue'

const route = useRoute()
const authStore = useAuthStore()
</script>

<template>
  <div>
    <AppNav v-if="route.meta.requiresAuth && authStore.isAuthenticated" />
    <header v-else class="bg-white border-b">
      <div class="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
        <RouterLink to="/" class="text-lg font-semibold">Budget Analyzer</RouterLink>
        <nav class="flex gap-2">
          <RouterLink to="/login" class="px-3 py-1.5 rounded-md hover:bg-gray-100">Login</RouterLink>
          <RouterLink to="/register" class="px-3 py-1.5 rounded-md bg-primary text-white hover:opacity-90">Register</RouterLink>
        </nav>
      </div>
    </header>
    <main>
      <RouterView />
    </main>
  </div>
</template>
