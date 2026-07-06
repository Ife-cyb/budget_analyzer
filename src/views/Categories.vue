<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useTransactionsStore } from '../store/transactions'
import { useWorkspaceStore } from '../store/workspace'

const store = useTransactionsStore()
const workspaceStore = useWorkspaceStore()

const newName = ref('')
const addError = ref('')
const editing = reactive({ id: null, name: '', error: '' })
const deleteError = ref('')

onMounted(() => {
  store.init().catch(() => {})
})

const rows = computed(() =>
  store.categories.map((c) => ({
    ...c,
    usage: store.categoryUsage[c.id] || 0,
  }))
)

async function addCategory() {
  addError.value = ''
  try {
    await store.addCategory(newName.value)
    newName.value = ''
  } catch (error) {
    addError.value = error?.message || 'Unable to add category.'
  }
}

function startEditing(category) {
  editing.id = category.id
  editing.name = category.name
  editing.error = ''
  deleteError.value = ''
}

function cancelEditing() {
  editing.id = null
  editing.name = ''
  editing.error = ''
}

async function saveRename() {
  editing.error = ''
  try {
    await store.renameCategory(editing.id, editing.name)
    cancelEditing()
  } catch (error) {
    editing.error = error?.message || 'Unable to rename category.'
  }
}

async function removeCategory(category) {
  deleteError.value = ''
  try {
    await store.removeCategory(category.id)
  } catch (error) {
    deleteError.value = error?.message || 'Unable to delete category.'
  }
}
</script>

<template>
  <div class="max-w-3xl mx-auto px-4 py-6 space-y-6">
    <header class="flex items-center justify-between">
      <h2 class="text-xl font-semibold">Categories</h2>
      <RouterLink to="/" class="text-primary">Back to Dashboard</RouterLink>
    </header>

    <p v-if="store.loading" class="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-700">
      Loading your budget data...
    </p>

    <p v-if="store.error" class="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      {{ store.error }}
    </p>

    <section v-if="workspaceStore.canWrite" class="bg-white rounded-lg shadow p-4 space-y-3">
      <h3 class="font-semibold">Add category</h3>
      <form class="flex flex-col sm:flex-row gap-3" @submit.prevent="addCategory">
        <label class="sr-only" for="new-category">Category name</label>
        <input
          id="new-category"
          v-model="newName"
          type="text"
          class="flex-1 px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="e.g., Groceries"
        />
        <button
          type="submit"
          class="px-4 py-2 rounded-md bg-primary text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="store.categorySaving"
        >
          {{ store.categorySaving ? 'Saving...' : 'Add' }}
        </button>
      </form>
      <p v-if="addError" class="text-sm text-red-600">{{ addError }}</p>
    </section>

    <section class="bg-white rounded-lg shadow p-4 space-y-2">
      <p v-if="deleteError" class="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        {{ deleteError }}
      </p>
      <p v-if="rows.length === 0 && !store.loading" class="py-6 text-center text-sm text-gray-500">
        No categories yet.
      </p>
      <ul v-else class="divide-y divide-gray-100">
        <li v-for="category in rows" :key="category.id" class="py-3">
          <div v-if="editing.id === category.id" class="space-y-2">
            <form class="flex flex-col sm:flex-row gap-2" @submit.prevent="saveRename">
              <input
                v-model="editing.name"
                type="text"
                class="flex-1 px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <div class="flex gap-2">
                <button
                  type="submit"
                  class="px-3 py-2 rounded-md bg-primary text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  :disabled="store.categorySaving"
                >
                  {{ store.categorySaving ? 'Saving...' : 'Save' }}
                </button>
                <button type="button" class="px-3 py-2 rounded-md border border-gray-300 hover:bg-gray-100" @click="cancelEditing">
                  Cancel
                </button>
              </div>
            </form>
            <p v-if="editing.error" class="text-sm text-red-600">{{ editing.error }}</p>
          </div>
          <div v-else class="flex items-center justify-between gap-3">
            <div>
              <p class="font-medium">{{ category.name }}</p>
              <p class="text-sm text-gray-500">
                {{ category.usage }} transaction{{ category.usage === 1 ? '' : 's' }}
              </p>
            </div>
            <div v-if="workspaceStore.canManage" class="flex items-center gap-3">
              <button class="text-sm text-blue-600 hover:underline" @click="startEditing(category)">Rename</button>
              <button
                class="text-sm hover:underline disabled:cursor-not-allowed"
                :class="category.usage > 0 ? 'text-gray-400' : 'text-red-600'"
                :disabled="category.usage > 0 || store.categorySaving"
                :title="category.usage > 0 ? 'In use by transactions — reassign them first' : 'Delete category'"
                @click="removeCategory(category)"
              >
                Delete
              </button>
            </div>
          </div>
        </li>
      </ul>
      <p class="text-xs text-gray-500">
        Categories in use by transactions can't be deleted. Renaming is safe — existing transactions follow the new name.
      </p>
    </section>
  </div>
</template>
