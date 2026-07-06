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

const CATEGORY_SELECT = 'id, name, created_at'

function normalizeCategories(rows = []) {
  return rows.map((row) => row.name).filter(Boolean)
}

export async function listCategories(userId) {
  const { data, error } = await getSupabaseClient()
    .from('categories')
    .select(CATEGORY_SELECT)
    .eq('user_id', userId)
    .order('name', { ascending: true })

  if (error) throw error
  return normalizeCategories(data)
}

export async function ensureDefaultCategories(userId) {
  const existing = await listCategories(userId)
  if (existing.length > 0) return existing

  const rows = DEFAULT_CATEGORIES.map((name) => ({
    user_id: userId,
    name,
  }))

  const { error } = await getSupabaseClient()
    .from('categories')
    .upsert(rows, {
      ignoreDuplicates: true,
      onConflict: 'user_id,name',
    })

  if (error) throw error
  return listCategories(userId)
}
