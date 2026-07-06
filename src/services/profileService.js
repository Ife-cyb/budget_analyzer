import { getSupabaseClient } from './supabaseClient'

export const DEFAULT_CURRENCY = 'USD'

const PROFILE_SELECT = 'id, email, full_name, currency, created_at, updated_at'

function normalizeProfile(row) {
  if (!row) return null

  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name || '',
    currency: row.currency || DEFAULT_CURRENCY,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function profileFromUser(user) {
  return {
    id: user.id,
    email: user.email,
    full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
    currency: DEFAULT_CURRENCY,
  }
}

export async function getProfile(userId) {
  const { data, error } = await getSupabaseClient()
    .from('profiles')
    .select(PROFILE_SELECT)
    .eq('id', userId)
    .maybeSingle()

  if (error) throw error
  return normalizeProfile(data)
}

export async function getOrCreateProfile(user) {
  const existing = await getProfile(user.id)
  if (existing) return existing

  const { data, error } = await getSupabaseClient()
    .from('profiles')
    .insert(profileFromUser(user))
    .select(PROFILE_SELECT)
    .single()

  if (error) throw error
  return normalizeProfile(data)
}

export async function updateProfileCurrency(userId, currency) {
  const { data, error } = await getSupabaseClient()
    .from('profiles')
    .update({ currency })
    .eq('id', userId)
    .select(PROFILE_SELECT)
    .single()

  if (error) throw error
  return normalizeProfile(data)
}
