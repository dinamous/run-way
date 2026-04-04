import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { ClientOption } from '@/contexts/AuthContext'

export function useUserClients() {
  const [userClients, setUserClients] = useState<ClientOption[]>([])
  const [availableClients, setAvailableClients] = useState<ClientOption[]>([])
  const [loading, setLoading] = useState(true)

  const fetchClients = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: member } = await supabase
      .from('members')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!member) return

    const [{ data: uc }, { data: allClients }] = await Promise.all([
      supabase.from('user_clients').select('client_id').eq('user_id', member.id),
      supabase.from('clients').select('id, name').order('name'),
    ])

    const clientIds = (uc ?? []).map((r: { client_id: string }) => r.client_id)
    setUserClients(
      (allClients ?? []).filter(c => clientIds.includes(c.id)).map(c => ({
        id: c.id,
        name: c.name,
      }))
    )
    setAvailableClients(
      (allClients ?? []).map(c => ({ id: c.id, name: c.name }))
    )
    setLoading(false)
  }, [])

  const linkToClient = useCallback(async (clientId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { data: member } = await supabase
      .from('members')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!member) return false

    const { error } = await supabase
      .from('user_clients')
      .upsert({ user_id: member.id, client_id: clientId })

    if (!error) {
      await fetchClients()
      return true
    }
    return false
  }, [fetchClients])

  const unlinkFromClient = useCallback(async (clientId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { data: member } = await supabase
      .from('members')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!member) return false

    const { error } = await supabase
      .from('user_clients')
      .delete()
      .match({ user_id: member.id, client_id: clientId })

    if (!error) {
      await fetchClients()
      return true
    }
    return false
  }, [fetchClients])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  return { userClients, availableClients, loading, linkToClient, unlinkFromClient, refetch: fetchClients }
}
