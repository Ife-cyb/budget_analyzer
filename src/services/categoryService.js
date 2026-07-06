import { getSupabaseClient } from './supabaseClient'

export const DEFAULT_CATEGORIES = [
  'Food',
  'Transport',
  'Entertainment',
  'Utilities',
  'Health',
  'Education',
  'Other',
]

const CATEGORY_SELECT = 'id, name, created_by, created_at'

function normalizeCategory(row) {
  return {
    id: row.id,
    name: row.name,
    createdBy: row.created_by,
    createdAt: row.created_at,
  }
}

export async function listCategories(workspaceId) {
  const { data, error } = await getSupabaseClient()
    .from('categories')
    .select(CATEGORY_SELECT)
    .eq('workspace_id', workspaceId)
    .order('name', { ascending: true })

  if (error) throw error
  return data.map(normalizeCategory)
}

export async function ensureDefaultCategories(workspaceId, userId) {
  const existing = await listCategories(workspaceId)
  if (existing.length > 0) return existing

  const rows = DEFAULT_CATEGORIES.map((name) => ({
    workspace_id: workspaceId,
    created_by: userId,
    name,
  }))

  const { error } = await getSupabaseClient()
    .from('categories')
    .upsert(rows, {
      ignoreDuplicates: true,
      onConflict: 'workspace_id,name',
    })

  if (error) throw error
  return listCategories(workspaceId)
}

export async function createCategory(workspaceId, userId, name) {
  const { data, error } = await getSupabaseClient()
    .from('categories')
    .insert({ workspace_id: workspaceId, created_by: userId, name })
    .select(CATEGORY_SELECT)
    .single()

  if (error) throw error
  return normalizeCategory(data)
}

export async function renameCategory(workspaceId, id, name) {
  const { data, error } = await getSupabaseClient()
    .from('categories')
    .update({ name })
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .select(CATEGORY_SELECT)
    .single()

  if (error) throw error
  return normalizeCategory(data)
}

export async function deleteCategory(workspaceId, id) {
  const { error } = await getSupabaseClient()
    .from('categories')
    .delete()
    .eq('id', id)
    .eq('workspace_id', workspaceId)

  if (error) throw error
}
