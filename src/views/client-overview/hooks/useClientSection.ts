import { useState, useEffect, useCallback, useRef } from 'react'

export interface SectionState<T> {
  data: T | null
  loading: boolean
  error: string | null
  retry: () => void
}

/**
 * Hook genérico para uma seção de card com ciclo de vida independente.
 * Expõe loading/error/retry por seção.
 */
export function useClientSection<T>(
  clientId: string | null,
  fetcher: (clientId: string, signal: AbortSignal) => Promise<T>,
): SectionState<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const retryCountRef = useRef(0)

  const load = useCallback(async () => {
    if (!clientId) {
      setData(null)
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    const controller = new AbortController()

    try {
      const result = await fetcher(clientId, controller.signal)
      setData(result)
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados')
    } finally {
      setLoading(false)
    }

    return () => controller.abort()
  }, [clientId, fetcher, retryCountRef.current]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const cleanup = load()
    return () => { cleanup?.then((fn) => fn?.()) }
  }, [load])

  const retry = useCallback(() => {
    retryCountRef.current++
    load()
  }, [load])

  return { data, loading, error, retry }
}
