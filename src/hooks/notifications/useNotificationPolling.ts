import { useCallback, useEffect, useRef } from 'react'

interface UseNotificationPollingProps {
  enabled: boolean
  interval?: number
  fn: () => Promise<void> | void
}

export function useNotificationPolling({
  enabled,
  interval = 15000,
  fn,
}: UseNotificationPollingProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const runningRef = useRef(false)
  const currentInterval = useRef(interval)
  const runRef = useRef<(() => Promise<void>) | null>(null)

  const run = useCallback(async () => {
    if (runningRef.current) return
    if (document.visibilityState !== 'visible') return

    runningRef.current = true

    try {
      await fn()
      currentInterval.current = interval
    } catch {
      currentInterval.current = Math.min(currentInterval.current * 2, 120000)
    } finally {
      runningRef.current = false
      if (enabled) {
        timerRef.current = setTimeout(() => runRef.current?.(), currentInterval.current)
      }
    }
  }, [enabled, fn, interval])

  runRef.current = run

  useEffect(() => {
    if (!enabled || !fn) return

    run()

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [enabled, fn, run])

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && enabled) {
        run()
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [enabled, run])
}
