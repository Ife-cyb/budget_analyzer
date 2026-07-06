import { getSupabaseClient } from './supabaseClient'

const WORKSPACE_SELECT = 'id, name, type, created_by, created_at'
const MEMBERSHIP_SELECT = `role, workspace:workspaces(${WORKSPACE_SELECT})`

function normalizeWorkspace(row, role) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    createdBy: row.created_by,
    createdAt: row.created_at,
    role,
  }
}

export async function listMyWorkspaces(userId) {
  const { data, error } = await getSupabaseClient()
    .from('workspace_members')
    .select(MEMBERSHIP_SELECT)
    .eq('user_id', userId)

  if (error) throw error
  return data
    .filter((row) => row.workspace)
    .map((row) => normalizeWorkspace(row.workspace, row.role))
    .sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'personal' ? -1 : 1))
}

export async function createWorkspace(userId, name, type = 'team') {
  const { data, error } = await getSupabaseClient()
    .from('workspaces')
    .insert({ name, type, created_by: userId })
    .select(WORKSPACE_SELECT)
    .single()

  if (error) throw error
  // The on_workspace_created trigger makes the creator owner.
  return normalizeWorkspace(data, 'owner')
}

export async function getMembers(workspaceId) {
  const { data, error } = await getSupabaseClient()
    .from('workspace_members')
    .select('user_id, role, created_at')
    .eq('workspace_id', workspaceId)

  if (error) throw error

  // No FK between workspace_members and profiles, so resolve names in a
  // second query. RLS limits visibility to workspace peers (003 migration);
  // unreadable profiles simply stay unresolved.
  const userIds = data.map((row) => row.user_id)
  let profilesById = {}
  if (userIds.length) {
    const { data: profiles, error: profilesError } = await getSupabaseClient()
      .from('profiles')
      .select('id, full_name, email')
      .in('id', userIds)

    if (profilesError) throw profilesError
    profilesById = Object.fromEntries(profiles.map((p) => [p.id, p]))
  }

  return data.map((row) => {
    const profile = profilesById[row.user_id]
    return {
      userId: row.user_id,
      role: row.role,
      createdAt: row.created_at,
      fullName: profile?.full_name || '',
      email: profile?.email || '',
    }
  })
}
