import { MotionItem } from '@/components/ui'
import type { ClientSummary } from '../hooks/useOverviewData'

interface ActiveClientsProps {
  clients: ClientSummary[]
  loading: boolean
  onSelectClient: (clientId: string) => void
}

const CLIENT_COLORS = [
  'bg-violet-500/15 text-violet-600 dark:text-violet-400',
  'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  'bg-rose-500/15 text-rose-600 dark:text-rose-400',
  'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400',
]

function clientColor(name: string): string {
  return CLIENT_COLORS[name.charCodeAt(0) % CLIENT_COLORS.length]
}

function clientInitials(name: string): string {
  return name.slice(0, 2).toUpperCase()
}

function RiskDot({ risk }: { risk: ClientSummary['risk'] }) {
  if (risk === 'critical') {
    return (
      <span
        className="flex h-2 w-2 shrink-0 rounded-full bg-red-500 dark:bg-red-400"
        aria-label="Risco crítico"
      />
    )
  }
  if (risk === 'attention') {
    return (
      <span
        className="flex h-2 w-2 shrink-0 rounded-full bg-amber-400 dark:bg-amber-400"
        aria-label="Atenção"
      />
    )
  }
  return (
    <span
      className="flex h-2 w-2 shrink-0 rounded-full bg-emerald-400 dark:bg-emerald-500"
      aria-label="Saudável"
    />
  )
}

export function ActiveClients({ clients, loading, onSelectClient }: ActiveClientsProps) {
  // Sort: critical first, then attention, then healthy
  const riskOrder = { critical: 0, attention: 1, healthy: 2 }
  const sorted = [...clients].sort((a, b) => riskOrder[a.risk] - riskOrder[b.risk])
  const visible = sorted.slice(0, 7)

  if (loading) {
    return (
      <div className="overview-card rounded-xl p-6 flex flex-col gap-4">
        <div className="h-4 w-28 animate-pulse rounded bg-muted/50" />
        <div className="flex flex-col gap-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-muted/40" />
          ))}
        </div>
      </div>
    )
  }

  const criticalCount = clients.filter((c) => c.risk === 'critical').length
  const attentionCount = clients.filter((c) => c.risk === 'attention').length

  return (
    <div className="overview-card rounded-xl p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Clientes</h3>
        {(criticalCount > 0 || attentionCount > 0) && (
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {criticalCount > 0 && (
              <span className="text-red-600 dark:text-red-400 font-medium">
                {criticalCount} {criticalCount === 1 ? 'crítico' : 'críticos'}
              </span>
            )}
            {criticalCount > 0 && attentionCount > 0 && <span className="mx-1 opacity-40">·</span>}
            {attentionCount > 0 && (
              <span className="text-amber-600 dark:text-amber-400 font-medium">
                {attentionCount} {attentionCount === 1 ? 'atenção' : 'atenção'}
              </span>
            )}
          </span>
        )}
      </div>

      {clients.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum cliente atribuído</p>
      ) : (
        <div className="flex flex-col gap-0.5">
          {visible.map((client, i) => (
            <MotionItem key={client.id} delay={i * 40}>
              <button
                onClick={() => onSelectClient(client.id)}
                className="w-full flex items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors duration-150 hover:bg-foreground/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
              <div
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold ${clientColor(client.name)}`}
              >
                {clientInitials(client.name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground leading-snug">
                  {client.name}
                </p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {client.activeTaskCount}{' '}
                  {client.activeTaskCount === 1 ? 'tarefa' : 'tarefas'}
                  {client.lateSubtaskCount > 0 && (
                    <span className={`ml-1.5 ${client.risk === 'critical' ? 'text-red-500 dark:text-red-400' : 'text-amber-500 dark:text-amber-400'}`}>
                      · {client.lateSubtaskCount} atrasada{client.lateSubtaskCount > 1 ? 's' : ''}
                    </span>
                  )}
                </p>
              </div>
              <RiskDot risk={client.risk} />
              </button>
            </MotionItem>
          ))}
        </div>
      )}
    </div>
  )
}
