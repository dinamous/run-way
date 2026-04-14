import { useEffect, useRef } from 'react'

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

  const run = async () => {
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
        timerRef.current = setTimeout(run, currentInterval.current)
      }
    }
  }

  useEffect(() => {
    if (!enabled || !fn) return

    run()

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [enabled, fn])

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && enabled) {
        run()
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [enabled])
}