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
  let clientsQuery = supabase.from('clients').select('id, name').order('name')
  if (!isAdmin && clientIds.length > 0) clientsQuery = clientsQuery.in('id', clientIds)

  let tasksQuery = supabase
    .from('tasks')
    .select('client_id')
    .is('concluded_at', null)

  if (!isAdmin && clientIds.length > 0) {
    tasksQuery = tasksQuery.in('client_id', clientIds)
  }

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

const CLIENTS_CACHE_TTL_MS = 2 * 60 * 1000

type ClientsCache = { clients: ClientSummary[]; ts: number }
const clientsCache = new Map<string, ClientsCache>()

function getCachedClients(key: string): ClientSummary[] | null {
  const entry = clientsCache.get(key)
  if (!entry) return null
  if (Date.now() - entry.ts > CLIENTS_CACHE_TTL_MS) {
    clientsCache.delete(key)
    return null
  }
  return entry.clients
}

export function useClientsData({ isAdmin, clients, subtasksLateByClient }: UseClientsDataParams): ClientsData {
  const clientKey = useMemo(() => clients.map((c) => c.id).sort().join(','), [clients])
  const cacheKey = `${isAdmin}:${clientKey}`

  const [rawClients, setRawClients] = useState<ClientSummary[]>(() => getCachedClients(cacheKey) ?? [])
  const [loading, setLoading] = useState(() => getCachedClients(cacheKey) === null)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    const clientIds = clientKey ? clientKey.split(',') : []
    const cached = getCachedClients(cacheKey)

    if (cached) {
      setRawClients(cached)
      setLoading(false)
      return
    }

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchClientSummaries(clientIds, isAdmin)
        if (!cancelled) {
          clientsCache.set(cacheKey, { clients: data, ts: Date.now() })
          setRawClients(data)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Erro ao carregar clientes')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [isAdmin, clientKey, cacheKey, tick])

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
    retry: () => { clientsCache.delete(cacheKey); setTick((t) => t + 1) },
  }
}
