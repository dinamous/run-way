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

  return {
    id: data.id,
    name: data.name,
    role: data.role,
    avatarUrl: data.avatar_url,
    capacity: Math.max(1, data.capacity ?? 6),
  }
}

export function useWorkloadData({ memberId, isAdmin }: UseWorkloadDataParams): WorkloadData {
  const [personalWorkload, setPersonalWorkload] = useState<PersonalWorkload>({ member: null, metrics: null, insights: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      setPersonalWorkload({ member: null, metrics: null, insights: [] })
      try {
        const today = new Date().toISOString().slice(0, 10)
        const since14d = (() => {
          const d = new Date(today + 'T00:00:00')
          d.setDate(d.getDate() - 14)
          return d.toISOString().split('T')[0]
        })()

        const [memberResult, activeTasksResult, concludedTasksResult] = await Promise.all([
          fetchMemberProfile(memberId),
          fetchActiveTasksWithHours(null, isAdmin),
          fetchConcludedTasksSince(since14d, null, isAdmin),
        ])

        if (!cancelled) {
          setPersonalWorkload(buildPersonalWorkload(memberResult, activeTasksResult, concludedTasksResult, today))
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Erro ao carregar carga de trabalho')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [memberId, isAdmin, tick])

  return {
    personalWorkload,
    loading,
    error,
    retry: () => setTick((t) => t + 1),
  }
}
