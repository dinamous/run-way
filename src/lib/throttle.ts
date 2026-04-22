import { toast } from 'sonner'

/**
 * Wraps a plain async function with client-side throttling.
 * Use this outside of React components/hooks (lib functions, utilities).
 * For hooks, use `useThrottledMutation` instead.
 */
export function throttleAsync<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  ms: number,
): (...args: T) => Promise<R | false> {
  let lastCall = 0

  return (...args: T) => {
    const now = Date.now()
    if (now - lastCall < ms) {
      toast.error('Aguarde antes de repetir esta operação')
      return Promise.resolve(false as R & false)
    }
    lastCall = now
    return fn(...args)
  }
}
