import { supabase } from '@/lib/supabase'
import type { RawTask, RawMember } from './clientOverviewTransformers'

export interface ClientOverviewRaw {
  client: { id: string; name: string }
  tasks: RawTask[]
  otherClientTasks: RawTaskWithClient[]
  members: RawMember[]
}

export interface RawTaskWithClient extends RawTask {
  client_id: string | null
  clients: { id: string; name: string } | null
}

const TASK_SELECT = `
  id,
  title,
  clickup_link,
  concluded_at,
  created_at,
  client_id,
  clients (id, name),
  task_subtasks (
    id,
    title,
    start_date,
    end_date,
    status,
    subtask_assignees (
      member_id,
      members (
        id,
        name,
        role,
        avatar_url,
        capacity
      )
    )
  )
`

export async function fetchClientOverviewRaw(clientId: string): Promise<ClientOverviewRaw> {
  const [clientResult, tasksResult, clientMembersResult] = await Promise.all([
    supabase.from('clients').select('id, name').eq('id', clientId).single(),
    supabase
      .from('tasks')
      .select(TASK_SELECT)
      .eq('client_id', clientId)
      .is('concluded_at', null)
      .order('created_at', { ascending: false }),
    supabase
      .from('user_clients')
      .select('members (id, name, role, avatar_url, capacity)')
      .eq('client_id', clientId),
  ])

  if (clientResult.error) throw new Error(clientResult.error.message)
  if (tasksResult.error) throw new Error(tasksResult.error.message)
  if (clientMembersResult.error) throw new Error(clientMembersResult.error.message)
  if (!clientResult.data) throw new Error('Cliente não encontrado')

  const members = (clientMembersResult.data ?? [])
    .map((row) => row.members as unknown as RawMember | null)
    .filter((m): m is RawMember => m != null)

  const memberIds = members.map((m) => m.id)

  // Fetch active tasks of these members from OTHER clients for cross-client workload
  let otherClientTasks: RawTaskWithClient[] = []
  if (memberIds.length > 0) {
    const { data: otherTasksData } = await supabase
      .from('tasks')
      .select(TASK_SELECT)
      .neq('client_id', clientId)
      .is('concluded_at', null)
      .not('client_id', 'is', null)
    if (otherTasksData) {
      // Keep only tasks that have at least one assignee in our member list
      otherClientTasks = (otherTasksData as RawTaskWithClient[]).filter((t) =>
        (t.task_subtasks ?? []).some((s) =>
          (s.subtask_assignees ?? []).some((a) => memberIds.includes(a.member_id))
        )
      )
    }
  }

  return {
    client: { id: clientResult.data.id, name: clientResult.data.name },
    tasks: (tasksResult.data ?? []) as RawTask[],
    otherClientTasks,
    members,
  }
}
