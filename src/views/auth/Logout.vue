<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../store/auth'
import { useExpensesStore } from '../../store/expenses'

const authStore = useAuthStore()
const expensesStore = useExpensesStore()
const router = useRouter()
const error = ref('')

onMounted(async () => {
  try {
    await authStore.signOut()
    expensesStore.reset()
    router.replace('/login')
  } catch (err) {
    error.value = err?.message || 'Unable to sign out.'
  }
})
</script>

<template>
  <div class="mx-auto max-w-md px-4 py-12 text-center">
    <p v-if="error" class="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      {{ error }}
    </p>
    <p v-else class="text-gray-600">Signing out...</p>
  </div>
</template>
