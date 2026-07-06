import { defineStore } from 'pinia'
import { createWorkspace, getMembers, listMyWorkspaces } from '../services/workspaceService'
import { useAuthStore } from './auth'
import { useTransactionsStore } from './transactions'

const ACTIVE_WORKSPACE_KEY = 'budget-analyzer:activeWorkspaceId'

const WRITE_ROLES = ['owner', 'admin', 'member']
const MANAGE_ROLES = ['owner', 'admin']

function errorMessage(error) {
  return error?.message || 'Something went wrong. Please try again.'
}

function readPersistedWorkspaceId() {
  try {
    return localStorage.getItem(ACTIVE_WORKSPACE_KEY)
  } catch {
    return null
  }
}

function persistWorkspaceId(id) {
  try {
    if (id) localStorage.setItem(ACTIVE_WORKSPACE_KEY, id)
    else localStorage.removeItem(ACTIVE_WORKSPACE_KEY)
  } catch {
    // localStorage unavailable (private mode); switching still works in-session.
  }
}

export const useWorkspaceStore = defineStore('workspace', {
  state: () => ({
    userId: null,
    workspaces: [],
    activeWorkspaceId: null,
    members: [],
    loading: false,
    creating: false,
    membersLoading: false,
    initialized: false,
    error: null,
  }),
  getters: {
    activeWorkspace(state) {
      return state.workspaces.find((w) => w.id === state.activeWorkspaceId) || null
    },
    activeRole() {
      return this.activeWorkspace?.role || null
    },
    isTeamWorkspace() {
      return this.activeWorkspace?.type === 'team'
    },
    // UI convenience only — RLS is the enforcement.
    canWrite() {
      return WRITE_ROLES.includes(this.activeRole)
    },
    canManage() {
      return MANAGE_ROLES.includes(this.activeRole)
    },
    isViewer() {
      return this.activeRole === 'viewer'
    },
    membersById(state) {
      return Object.fromEntries(state.members.map((m) => [m.userId, m]))
    },
  },
  actions: {
    reset() {
      this.userId = null
      this.workspaces = []
      this.activeWorkspaceId = null
      this.members = []
      this.loading = false
      this.creating = false
      this.membersLoading = false
      this.initialized = false
      this.error = null
      persistWorkspaceId(null)
    },
    memberName(userId) {
      const authStore = useAuthStore()
      if (userId === authStore.user?.id) return 'You'
      const member = this.membersById[userId]
      return member?.fullName || member?.email || 'Teammate'
    },
    async init({ force = false } = {}) {
      const authStore = useAuthStore()
      if (!authStore.initialized) {
        await authStore.initialize()
      }

      if (!authStore.user) {
        this.reset()
        return
      }

      if (!force && this.initialized && this.userId === authStore.user.id) {
        return
      }

      this.loading = true
      this.error = null
      this.userId = authStore.user.id

      try {
        let workspaces = await listMyWorkspaces(authStore.user.id)

        // Safety net for accounts that predate the workspace triggers.
        if (workspaces.length === 0) {
          const name = authStore.profile?.fullName || 'Personal'
          await createWorkspace(authStore.user.id, name, 'personal')
          workspaces = await listMyWorkspaces(authStore.user.id)
        }

        this.workspaces = workspaces

        const persistedId = readPersistedWorkspaceId()
        const active =
          workspaces.find((w) => w.id === persistedId) ||
          workspaces.find((w) => w.type === 'personal') ||
          workspaces[0]
        this.activeWorkspaceId = active?.id || null
        persistWorkspaceId(this.activeWorkspaceId)

        this.initialized = true
        await this.loadMembers()
      } catch (error) {
        this.error = errorMessage(error)
        throw error
      } finally {
        this.loading = false
      }
    },
    async loadMembers() {
      this.members = []
      if (!this.activeWorkspaceId || !this.isTeamWorkspace) return

      this.membersLoading = true
      try {
        this.members = await getMembers(this.activeWorkspaceId)
      } catch (error) {
        // Non-fatal: rows fall back to "Teammate" labels.
        this.error = errorMessage(error)
      } finally {
        this.membersLoading = false
      }
    },
    async setActiveWorkspace(id) {
      if (!id || id === this.activeWorkspaceId) return
      if (!this.workspaces.some((w) => w.id === id)) return

      this.activeWorkspaceId = id
      persistWorkspaceId(id)
      this.error = null

      const transactionsStore = useTransactionsStore()
      await Promise.all([this.loadMembers(), transactionsStore.init({ force: true })])
    },
    async createTeamWorkspace(name) {
      const trimmed = String(name || '').trim()
      if (!trimmed) throw new Error('Workspace name is required.')

      const authStore = useAuthStore()
      if (!authStore.user) throw new Error('You must be signed in to create a workspace.')

      this.creating = true
      this.error = null

      try {
        const workspace = await createWorkspace(authStore.user.id, trimmed, 'team')
        this.workspaces = [...this.workspaces, workspace]
        await this.setActiveWorkspace(workspace.id)
        return workspace
      } catch (error) {
        this.error = errorMessage(error)
        throw error
      } finally {
        this.creating = false
      }
    },
  },
})
