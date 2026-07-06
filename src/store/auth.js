import { defineStore } from 'pinia'
import {
  getCurrentSession,
  registerWithEmail,
  signInWithEmail,
  signOutCurrentUser,
  subscribeToAuthChanges,
} from '../services/authService'
import { getOrCreateProfile } from '../services/profileService'

let authSubscription = null

function errorMessage(error) {
  return error?.message || 'Something went wrong. Please try again.'
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    session: null,
    user: null,
    profile: null,
    loading: false,
    initialized: false,
    error: null,
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.user),
  },
  actions: {
    applySession(session) {
      this.session = session
      this.user = session?.user || null
    },
    async loadProfile() {
      if (!this.user) {
        this.profile = null
        return null
      }

      this.profile = await getOrCreateProfile(this.user)
      return this.profile
    },
    watchAuthChanges() {
      if (authSubscription) return

      authSubscription = subscribeToAuthChanges(async (_event, session) => {
        this.applySession(session)

        if (!session?.user) {
          this.profile = null
          return
        }

        try {
          await this.loadProfile()
        } catch (error) {
          this.error = errorMessage(error)
        }
      })
    },
    async initialize() {
      if (this.initialized) return

      this.loading = true
      this.error = null

      try {
        const session = await getCurrentSession()
        this.applySession(session)
        this.watchAuthChanges()

        if (this.user) {
          await this.loadProfile()
        }
      } catch (error) {
        this.error = errorMessage(error)
      } finally {
        this.initialized = true
        this.loading = false
      }
    },
    async signIn(email, password) {
      this.loading = true
      this.error = null

      try {
        const data = await signInWithEmail(email, password)
        this.applySession(data.session)

        if (this.user) {
          await this.loadProfile()
        }

        return data
      } catch (error) {
        this.error = errorMessage(error)
        throw error
      } finally {
        this.initialized = true
        this.loading = false
      }
    },
    async register(email, password, metadata = {}) {
      this.loading = true
      this.error = null

      try {
        const data = await registerWithEmail(email, password, metadata)
        this.applySession(data.session)

        if (this.user) {
          await this.loadProfile()
        }

        return data
      } catch (error) {
        this.error = errorMessage(error)
        throw error
      } finally {
        this.initialized = true
        this.loading = false
      }
    },
    async signOut() {
      this.loading = true
      this.error = null

      try {
        await signOutCurrentUser()
        this.applySession(null)
        this.profile = null
      } catch (error) {
        this.error = errorMessage(error)
        throw error
      } finally {
        this.initialized = true
        this.loading = false
      }
    },
  },
})
