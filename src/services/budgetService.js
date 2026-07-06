import { getSupabaseClient } from './supabaseClient'

const BUDGET_SELECT = 'id, category, amount, created_at, updated_at'

function normalizeBudget(row) {
  return {
    id: row.id,
    category: row.category,
    amount: Number(row.amount),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function listBudgets(userId) {
  const { data, error } = await getSupabaseClient()
    .from('budgets')
    .select(BUDGET_SELECT)
    .eq('user_id', userId)
    .order('category', { ascending: true })

  if (error) throw error
  return data.map(normalizeBudget)
}

export async function upsertBudget(userId, category, amount) {
  const { data, error } = await getSupabaseClient()
    .from('budgets')
    .upsert(
      {
        user_id: userId,
        category,
        amount: Number(amount),
      },
      { onConflict: 'user_id,category' }
    )
    .select(BUDGET_SELECT)
    .single()

  if (error) throw error
  return normalizeBudget(data)
}

export async function deleteBudget(userId, category) {
  const { error } = await getSupabaseClient()
    .from('budgets')
    .delete()
    .eq('user_id', userId)
    .eq('category', category)

  if (error) throw error
}
