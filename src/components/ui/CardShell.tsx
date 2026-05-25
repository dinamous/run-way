import { useEffect, useRef, useReducer } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'

interface CardShellProps {
  loading: boolean
  error: string | null
  onRetry?: () => void
  skeleton: React.ReactNode
  children: React.ReactNode
  /** ms antes de mostrar erro de timeout; default 12000 */
  timeoutMs?: number
  className?: string
}

export function CardShell({
  loading,
  error,
  onRetry,
  skeleton,
  children,
  timeoutMs = 12000,
  className = '',
}: CardShellProps) {
  // useReducer evita chamar setState diretamente no body do effect
  const [timedOut, dispatchTimeout] = useReducer(
    (_: boolean, action: 'set' | 'reset') => action === 'set',
    false,
  )
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)

    if (loading) {
      timerRef.current = setTimeout(() => dispatchTimeout('set'), timeoutMs)
    } else {
      dispatchTimeout('reset')
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [loading, timeoutMs])

  const hasError = error || (loading && timedOut)

  if (hasError) {
    return (
      <div className={`overview-card rounded-xl p-6 flex flex-col items-center justify-center gap-3 min-h-[120px] ${className}`}>
        <AlertCircle className="h-5 w-5 text-muted-foreground/60" />
        <p className="text-sm text-muted-foreground text-center">
          {error ?? 'Tempo esgotado ao carregar'}
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-1.5 text-xs font-medium text-foreground hover:text-muted-foreground transition-colors cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Tentar novamente
          </button>
        )}
      </div>
    )
  }

  if (loading) return <>{skeleton}</>

  return <>{children}</>
}
