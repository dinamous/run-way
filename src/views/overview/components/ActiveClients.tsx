import type { ClientSummary } from '../hooks/useOverviewData'

interface ActiveClientsProps {
  clients: ClientSummary[]
  loading: boolean
  onSelectClient: (clientId: string) => void
}

const CLIENT_COLORS = [
  'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300',
  'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300',
]

function clientColor(name: string): string {
  return CLIENT_COLORS[name.charCodeAt(0) % CLIENT_COLORS.length]
}

function clientInitials(name: string): string {
  return name.slice(0, 2).toUpperCase()
}

export function ActiveClients({ clients, loading, onSelectClient }: ActiveClientsProps) {
  const visible = clients.slice(0, 6)

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-4 h-4 w-28 animate-pulse rounded bg-muted" />
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 flex flex-col gap-4">
      <h3 className="text-sm font-semibold text-foreground">Clientes Ativos</h3>

      {clients.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum cliente atribuído</p>
      ) : (
        <div className="flex flex-col gap-1">
          {visible.map((client) => (
            <button
              key={client.id}
              onClick={() => onSelectClient(client.id)}
              className="flex items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted/60"
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${clientColor(client.name)}`}
              >
                {clientInitials(client.name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground leading-snug">
                  {client.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {client.activeTaskCount}{' '}
                  {client.activeTaskCount === 1 ? 'tarefa ativa' : 'tarefas ativas'}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
