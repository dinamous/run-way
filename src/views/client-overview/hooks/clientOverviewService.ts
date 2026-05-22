import { supabase } from '@/lib/supabase'
import type { RawTask, RawMember } from './clientOverviewTransformers'

export interface ClientOverviewRaw {
  client: { id: string; name: string }
  tasks: RawTask[]
  members: RawMember[]
}

export async function fetchClientOverviewRaw(clientId: string): Promise<ClientOverviewRaw> {
  const [clientResult, tasksResult, clientMembersResult] = await Promise.all([
    supabase.from('clients').select('id, name').eq('id', clientId).single(),
    supabase
      .from('tasks')
      .select(`
        id,
        title,
        clickup_link,
        concluded_at,
        created_at,
        task_subtasks (
          id,
          title,
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
      `)
      .eq('client_id', clientId)
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

  return {
    client: { id: clientResult.data.id, name: clientResult.data.name },
    tasks: (tasksResult.data ?? []) as RawTask[],
    members,
  }
}
