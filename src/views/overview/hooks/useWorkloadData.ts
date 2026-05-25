import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { fetchActiveTasksWithHours, fetchConcludedTasksSince } from '@/lib/queries'
import { buildPersonalWorkload, type PersonalWorkload } from './overviewWorkload'

interface UseWorkloadDataParams {
  memberId: string
  isAdmin: boolean
}

export interface WorkloadData {
  personalWorkload: PersonalWorkload
  loading: boolean
  error: string | null
  retry: () => void
}

async function fetchMemberProfile(memberId: string) {
  const { data, error } = await supabase
    .from('members')
    .select('id, name, role, avatar_url, capacity')
    .eq('id', memberId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const row = data as unknown as { id: string; name: string; role: string; avatar_url: string | null; capacity: number | null }
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    avatarUrl: row.avatar_url,
    capacity: Math.max(1, row.capacity ?? 6),
  }
}

const WORKLOAD_CACHE_TTL_MS = 2 * 60 * 1000

type WorkloadCache = { workload: PersonalWorkload; ts: number }
const workloadCache = new Map<string, WorkloadCache>()

function getCachedWorkload(key: string): PersonalWorkload | null {
  const entry = workloadCache.get(key)
  if (!entry) return null
  if (Date.now() - entry.ts > WORKLOAD_CACHE_TTL_MS) {
    workloadCache.delete(key)
    return null
  }
  return entry.workload
}

export function useWorkloadData({ memberId, isAdmin }: UseWorkloadDataParams): WorkloadData {
  const cacheKey = `${memberId}:${isAdmin}`

  const [personalWorkload, setPersonalWorkload] = useState<PersonalWorkload>(
    () => getCachedWorkload(cacheKey) ?? { member: null, metrics: null, insights: [] }
  )
  const [loading, setLoading] = useState(() => getCachedWorkload(cacheKey) === null)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    const cached = getCachedWorkload(cacheKey)

    if (cached) {
      setPersonalWorkload(cached)
      setLoading(false)
      return
    }

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const today = new Date().toISOString().slice(0, 10)
        const since14d = (() => {
          const d = new Date(today + 'T00:00:00')
          d.setDate(d.getDate() - 14)
          return d.toISOString().split('T')[0]
        })()

        const [memberResult, activeTasksResult, concludedTasksResult] = await Promise.all([
          fetchMemberProfile(memberId),
          fetchActiveTasksWithHours(null, isAdmin, isAdmin ? null : memberId),
          fetchConcludedTasksSince(since14d, null, isAdmin, isAdmin ? null : memberId),
        ])

        if (!cancelled) {
          const result = buildPersonalWorkload(memberResult, activeTasksResult, concludedTasksResult, today)
          workloadCache.set(cacheKey, { workload: result, ts: Date.now() })
          setPersonalWorkload(result)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Erro ao carregar carga de trabalho')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [memberId, isAdmin, cacheKey, tick])

  return {
    personalWorkload,
    loading,
    error,
    retry: () => { workloadCache.delete(cacheKey); setTick((t) => t + 1) },
  }
}
