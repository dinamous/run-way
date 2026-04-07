import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { supabase } from '@/lib/supabase'
import type { Member } from '@/hooks/useSupabase'

async function fetchMembersFromDb(clientId: string | null | undefined): Promise<Member[]> {
  if (clientId === undefined) return []

  if (clientId === null) {
    const { data, error } = await supabase
      .from('members')
      .select('id, name, role, avatar, avatar_url, email, auth_user_id, access_role')
      .order('name')
    if (error) throw new Error(error.message)
    return data ?? []
  }

  const { data: userClients, error: ucError } = await supabase
    .from('user_clients')
    .select('user_id')
    .eq('client_id', clientId)

  if (ucError) throw new Error(ucError.message)

  const memberIds = (userClients ?? []).map(uc => uc.user_id)

  if (memberIds.length === 0) return []

  const { data, error } = await supabase
    .from('members')
    .select('id, name, role, avatar, avatar_url, email, auth_user_id, access_role')
    .in('id', memberIds)
    .order('name')

  if (error) throw new Error(error.message)
  return data ?? []
}

interface MemberState {
  members: Member[]
  loading: boolean
  error: string | null
  cachedClientId: string | null | undefined
}

interface MemberActions {
  fetchMembers: (clientId: string | null | undefined) => Promise<void>
  invalidate: () => void
}

type MemberStore = MemberState & MemberActions

export const useMemberStore = create<MemberStore>()(
  devtools(
    (set, get) => ({
      members: [],
      loading: false,
      error: null,
      cachedClientId: undefined,

      fetchMembers: async (clientId) => {
        if (clientId === undefined) return

        const state = get()
        if (state.loading) return

        const shouldFetch =
          clientId !== state.cachedClientId ||
          state.members.length === 0

        if (!shouldFetch) return

        set({ loading: true, error: null })
        try {
          const members = await fetchMembersFromDb(clientId)
          set({ members, cachedClientId: clientId, loading: false })
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'Erro ao carregar membros',
            loading: false,
          })
        }
      },

      invalidate: () => {
        set({ members: [], cachedClientId: undefined, error: null })
      },
    }),
    { name: 'app/members', enabled: true }
  )
)
