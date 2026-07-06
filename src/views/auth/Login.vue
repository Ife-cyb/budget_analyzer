<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../../store/auth'
import { isSupabaseConfigured, missingSupabaseConfigMessage } from '../../services/supabaseClient'

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()

const email = ref('')
const password = ref('')
const localError = ref('')

const formError = computed(() => localError.value || authStore.error)

async function submitLogin() {
  localError.value = ''

  if (!email.value || !password.value) {
    localError.value = 'Email and password are required.'
    return
  }

  try {
    await authStore.signIn(email.value, password.value)
    router.replace(route.query.redirect || '/')
  } catch (error) {
    localError.value = error?.message || 'Unable to sign in.'
  }
}
</script>

<template>
  <div class="min-h-[calc(100vh-73px)] bg-gray-50 px-4 py-10">
    <div class="mx-auto max-w-md rounded-lg bg-white p-6 shadow">
      <div class="mb-6 space-y-1">
        <p class="text-sm font-medium uppercase tracking-wide text-gray-500">Welcome back</p>
        <h1 class="text-2xl font-semibold">Sign in to Budget Analyzer</h1>
      </div>

      <p v-if="!isSupabaseConfigured" class="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
        {{ missingSupabaseConfigMessage }}
      </p>

      <p v-if="formError" class="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        {{ formError }}
      </p>

      <form class="space-y-4" @submit.prevent="submitLogin">
        <div>
          <label for="login-email" class="mb-1 block text-sm font-medium">Email</label>
          <input
            id="login-email"
            v-model.trim="email"
            type="email"
            autocomplete="email"
            class="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label for="login-password" class="mb-1 block text-sm font-medium">Password</label>
          <input
            id="login-password"
            v-model="password"
            type="password"
            autocomplete="current-password"
            class="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <button
          type="submit"
          class="w-full rounded-md bg-primary px-4 py-2 font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="authStore.loading || !isSupabaseConfigured"
        >
          {{ authStore.loading ? 'Signing in...' : 'Sign In' }}
        </button>
      </form>

      <p class="mt-5 text-center text-sm text-gray-600">
        New here?
        <RouterLink to="/register" class="font-medium text-primary">Create an account</RouterLink>
      </p>
    </div>
  </div>
</template>
