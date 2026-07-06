import { getSupabaseClient } from './supabaseClient'

const TRANSACTION_SELECT =
  'id, description, type, amount, date, category_id, created_by, created_at, updated_at, categories(id, name)'

function normalizeTransaction(row) {
  return {
    id: row.id,
    description: row.description,
    type: row.type || 'expense',
    categoryId: row.category_id,
    category: row.categories?.name || '',
    amount: Number(row.amount),
    date: row.date,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function transactionPayload(payload) {
  return {
    description: payload.description,
    type: payload.type || 'expense',
    category_id: payload.categoryId,
    amount: Number(payload.amount),
    date: payload.date,
  }
}

export async function listTransactions(workspaceId) {
  const { data, error } = await getSupabaseClient()
    .from('transactions')
    .select(TRANSACTION_SELECT)
    .eq('workspace_id', workspaceId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw error
  return data.map(normalizeTransaction)
}

export async function createTransaction(workspaceId, userId, payload) {
  const { data, error } = await getSupabaseClient()
    .from('transactions')
    .insert({
      ...transactionPayload(payload),
      workspace_id: workspaceId,
      created_by: userId,
    })
    .select(TRANSACTION_SELECT)
    .single()

  if (error) throw error
  return normalizeTransaction(data)
}

export async function updateTransaction(workspaceId, id, payload) {
  // created_by is never updated: an admin editing someone else's row must
  // not take ownership of it.
  const { data, error } = await getSupabaseClient()
    .from('transactions')
    .update(transactionPayload(payload))
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .select(TRANSACTION_SELECT)
    .single()

  if (error) throw error
  return normalizeTransaction(data)
}

export async function deleteTransaction(workspaceId, id) {
  const { error } = await getSupabaseClient()
    .from('transactions')
    .delete()
    .eq('id', id)
    .eq('workspace_id', workspaceId)

  if (error) throw error
}
