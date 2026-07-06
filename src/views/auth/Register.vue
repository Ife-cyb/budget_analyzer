<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../store/auth'
import { isSupabaseConfigured, missingSupabaseConfigMessage } from '../../services/supabaseClient'

const authStore = useAuthStore()
const router = useRouter()

const fullName = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const localError = ref('')
const successMessage = ref('')

const formError = computed(() => localError.value || authStore.error)

async function submitRegister() {
  localError.value = ''
  successMessage.value = ''

  if (!email.value || !password.value) {
    localError.value = 'Email and password are required.'
    return
  }

  if (password.value.length < 6) {
    localError.value = 'Password must be at least 6 characters.'
    return
  }

  if (password.value !== confirmPassword.value) {
    localError.value = 'Passwords do not match.'
    return
  }

  try {
    const data = await authStore.register(email.value, password.value, {
      full_name: fullName.value.trim(),
    })

    if (data.session) {
      router.replace('/')
      return
    }

    successMessage.value = 'Registration started. Check your email to confirm your account, then sign in.'
  } catch (error) {
    localError.value = error?.message || 'Unable to create your account.'
  }
}
</script>

<template>
  <div class="min-h-[calc(100vh-73px)] bg-gray-50 px-4 py-10">
    <div class="mx-auto max-w-md rounded-lg bg-white p-6 shadow">
      <div class="mb-6 space-y-1">
        <p class="text-sm font-medium uppercase tracking-wide text-gray-500">Get started</p>
        <h1 class="text-2xl font-semibold">Create your account</h1>
      </div>

      <p v-if="!isSupabaseConfigured" class="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
        {{ missingSupabaseConfigMessage }}
      </p>

      <p v-if="formError" class="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        {{ formError }}
      </p>

      <p v-if="successMessage" class="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
        {{ successMessage }}
      </p>

      <form class="space-y-4" @submit.prevent="submitRegister">
        <div>
          <label for="register-name" class="mb-1 block text-sm font-medium">Name</label>
          <input
            id="register-name"
            v-model.trim="fullName"
            type="text"
            autocomplete="name"
            class="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label for="register-email" class="mb-1 block text-sm font-medium">Email</label>
          <input
            id="register-email"
            v-model.trim="email"
            type="email"
            autocomplete="email"
            class="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label for="register-password" class="mb-1 block text-sm font-medium">Password</label>
          <input
            id="register-password"
            v-model="password"
            type="password"
            autocomplete="new-password"
            class="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label for="register-confirm-password" class="mb-1 block text-sm font-medium">Confirm Password</label>
          <input
            id="register-confirm-password"
            v-model="confirmPassword"
            type="password"
            autocomplete="new-password"
            class="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <button
          type="submit"
          class="w-full rounded-md bg-primary px-4 py-2 font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="authStore.loading || !isSupabaseConfigured"
        >
          {{ authStore.loading ? 'Creating account...' : 'Create Account' }}
        </button>
      </form>

      <p class="mt-5 text-center text-sm text-gray-600">
        Already have an account?
        <RouterLink to="/login" class="font-medium text-primary">Sign in</RouterLink>
      </p>
    </div>
  </div>
</template>
