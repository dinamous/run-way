import { Building2 } from 'lucide-react'
import type { ClientInfo } from '../hooks/useClientOverviewData'

interface ClientOverviewHeaderProps {
  client: ClientInfo | null
  loading: boolean
}

export function ClientOverviewHeader({ client, loading }: ClientOverviewHeaderProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-foreground/[0.06]">
        <Building2 className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="flex flex-col gap-0.5">
        {loading ? (
          <>
            <div className="h-5 w-40 animate-pulse rounded bg-muted/50" />
            <div className="h-3.5 w-24 animate-pulse rounded bg-muted/40" />
          </>
        ) : (
          <>
            <h1 className="text-lg font-semibold leading-snug text-foreground">
              {client?.name ?? '—'}
            </h1>
            <span className="text-xs text-muted-foreground">Visão geral do cliente</span>
          </>
        )}
      </div>
    </div>
  )
}
