import { getSupabaseClient } from './supabaseClient'

const BUDGET_SELECT = 'id, category_id, month, amount, created_at, updated_at'

function normalizeBudget(row) {
  return {
    id: row.id,
    categoryId: row.category_id,
    month: row.month,
    amount: Number(row.amount),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function listBudgets(workspaceId, month) {
  const { data, error } = await getSupabaseClient()
    .from('budgets_monthly')
    .select(BUDGET_SELECT)
    .eq('workspace_id', workspaceId)
    .eq('month', month)

  if (error) throw error
  return data.map(normalizeBudget)
}

export async function listBudgetHistory(workspaceId) {
  const { data, error } = await getSupabaseClient()
    .from('budgets_monthly')
    .select(BUDGET_SELECT)
    .eq('workspace_id', workspaceId)
    .order('month', { ascending: false })

  if (error) throw error
  return data.map(normalizeBudget)
}

// Inserts budgets for `month`; categories that already have a budget in that
// month are left untouched (ignoreDuplicates).
export async function copyBudgets(workspaceId, month, budgets) {
  const rows = budgets.map((b) => ({
    workspace_id: workspaceId,
    category_id: b.categoryId,
    month,
    amount: Number(b.amount),
  }))

  const { error } = await getSupabaseClient()
    .from('budgets_monthly')
    .upsert(rows, {
      onConflict: 'workspace_id,category_id,month',
      ignoreDuplicates: true,
    })

  if (error) throw error
}

export async function upsertBudget(workspaceId, categoryId, month, amount) {
  const { data, error } = await getSupabaseClient()
    .from('budgets_monthly')
    .upsert(
      {
        workspace_id: workspaceId,
        category_id: categoryId,
        month,
        amount: Number(amount),
      },
      { onConflict: 'workspace_id,category_id,month' }
    )
    .select(BUDGET_SELECT)
    .single()

  if (error) throw error
  return normalizeBudget(data)
}

export async function deleteBudget(workspaceId, categoryId, month) {
  const { error } = await getSupabaseClient()
    .from('budgets_monthly')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('category_id', categoryId)
    .eq('month', month)

  if (error) throw error
}
