import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import type { ClientOption } from '@/contexts/AuthContext'
import type { ClientSummary, ClientRisk } from './useOverviewData'

interface UseClientsDataParams {
  isAdmin: boolean
  clients: ClientOption[]
  subtasksLateByClient: Record<string, number>
}

export interface ClientsData {
  clients: ClientSummary[]
  loading: boolean
  error: string | null
  retry: () => void
}

async function fetchClientSummaries(clientIds: string[], isAdmin: boolean): Promise<ClientSummary[]> {
  const clientsQuery = supabase.from('clients').select('id, name').order('name')
  if (!isAdmin) clientsQuery.in('id', clientIds)

  const tasksQuery = supabase
    .from('tasks')
    .select('client_id')
    .is('concluded_at', null)

  const [{ data: clientsData }, { data: tasksData }] = await Promise.all([
    clientsQuery,
    tasksQuery,
  ])

  const clientList = clientsData ?? []
  if (clientList.length === 0) return []

  const taskCountByClient = (tasksData ?? []).reduce<Record<string, number>>((acc, t) => {
    if (t.client_id) acc[t.client_id] = (acc[t.client_id] ?? 0) + 1
    return acc
  }, {})

  return clientList.map((c) => ({
    id: c.id,
    name: c.name,
    activeTaskCount: taskCountByClient[c.id] ?? 0,
    lateSubtaskCount: 0,
    risk: 'healthy' as ClientRisk,
  }))
}

export function useClientsData({ isAdmin, clients, subtasksLateByClient }: UseClientsDataParams): ClientsData {
  const [rawClients, setRawClients] = useState<ClientSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const clientIds = clients.map((c) => c.id)
  const clientKey = clientIds.join(',')

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchClientSummaries(clientIds, isAdmin)
        if (!cancelled) setRawClients(data)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Erro ao carregar clientes')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [isAdmin, clientKey, tick]) // eslint-disable-line react-hooks/exhaustive-deps

  const enrichedClients = useMemo<ClientSummary[]>(() => {
    return rawClients.map((c) => {
      const lateCount = subtasksLateByClient[c.id] ?? 0
      const risk: ClientRisk = lateCount >= 2 ? 'critical' : lateCount === 1 ? 'attention' : 'healthy'
      return { ...c, lateSubtaskCount: lateCount, risk }
    })
  }, [rawClients, subtasksLateByClient])

  return {
    clients: enrichedClients,
    loading,
    error,
    retry: () => setTick((t) => t + 1),
  }
}
