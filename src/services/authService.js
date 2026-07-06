import { getSupabaseClient } from './supabaseClient'

export async function getCurrentSession() {
  const { data, error } = await getSupabaseClient().auth.getSession()
  if (error) throw error
  return data.session
}

export function subscribeToAuthChanges(callback) {
  const { data } = getSupabaseClient().auth.onAuthStateChange(callback)
  return data.subscription
}

export async function signInWithEmail(email, password) {
  const { data, error } = await getSupabaseClient().auth.signInWithPassword({
    email,
    password,
  })
  if (error) throw error
  return data
}

export async function registerWithEmail(email, password, metadata = {}) {
  const { data, error } = await getSupabaseClient().auth.signUp({
    email,
    password,
    options: {
      data: metadata,
    },
  })
  if (error) throw error
  return data
}

export async function signOutCurrentUser() {
  const { error } = await getSupabaseClient().auth.signOut()
  if (error) throw error
}
