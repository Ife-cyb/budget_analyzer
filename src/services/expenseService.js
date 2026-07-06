import { getSupabaseClient } from './supabaseClient'

const EXPENSE_SELECT = 'id, description, category, amount, date, created_at, updated_at'

function normalizeExpense(row) {
  return {
    id: row.id,
    description: row.description,
    category: row.category,
    amount: Number(row.amount),
    date: row.date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function expensePayload(userId, payload) {
  return {
    user_id: userId,
    description: payload.description,
    category: payload.category,
    amount: Number(payload.amount),
    date: payload.date,
  }
}

export async function listExpenses(userId) {
  const { data, error } = await getSupabaseClient()
    .from('expenses')
    .select(EXPENSE_SELECT)
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw error
  return data.map(normalizeExpense)
}

export async function createExpense(userId, payload) {
  const { data, error } = await getSupabaseClient()
    .from('expenses')
    .insert(expensePayload(userId, payload))
    .select(EXPENSE_SELECT)
    .single()

  if (error) throw error
  return normalizeExpense(data)
}

export async function updateExpense(userId, id, payload) {
  const { data, error } = await getSupabaseClient()
    .from('expenses')
    .update(expensePayload(userId, payload))
    .eq('id', id)
    .eq('user_id', userId)
    .select(EXPENSE_SELECT)
    .single()

  if (error) throw error
  return normalizeExpense(data)
}

export async function deleteExpense(userId, id) {
  const { error } = await getSupabaseClient()
    .from('expenses')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) throw error
}
