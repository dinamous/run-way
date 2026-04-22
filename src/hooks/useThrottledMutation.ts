import { useCallback, useRef } from 'react'
import { toast } from 'sonner'

/**
 * Wraps an async mutation fn with client-side throttling.
 * Calls within `ms` of the previous one are rejected immediately
 * with a toast warning and return `false`.
 */
export function useThrottledMutation<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  ms: number,
): (...args: T) => Promise<R | false> {
  const lastCall = useRef(0)

  return useCallback(
    (...args: T) => {
      const now = Date.now()
      if (now - lastCall.current < ms) {
        toast.error('Aguarde antes de repetir esta operação')
        return Promise.resolve(false as R & false)
      }
      lastCall.current = now
      return fn(...args)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fn, ms],
  )
}
