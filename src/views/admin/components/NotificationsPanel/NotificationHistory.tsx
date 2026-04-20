import { Clock, RefreshCw, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui'
import { NotificationList } from './NotificationList'
import type { UseNotificationsPanelReturn } from './useNotificationsPanel'

type Props = Pick<UseNotificationsPanelReturn,
  'history' | 'loadingHistory' | 'error' | 'grouped' | 'loadHistory' | 'handleMarkAsRead' | 'handleToggleRead'
>

export function NotificationHistory({ history, loadingHistory, error, grouped, loadHistory, handleMarkAsRead, handleToggleRead }: Props) {
  return (
    <div className="flex flex-col gap-4 min-h-0">
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          <h2 className="text-base font-semibold">Histórico</h2>
          {history.length > 0 && (
            <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">{history.length}</span>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={loadHistory} disabled={loadingHistory}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loadingHistory ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      <div className="overflow-y-auto flex-1 min-h-0 space-y-4 pr-1">
        {loadingHistory && !error ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <RefreshCw className="w-4 h-4 animate-spin" /> Carregando...
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-4 py-8 px-4 text-center border border-destructive/20 rounded-lg">
            <AlertTriangle className="w-8 h-8 text-destructive" />
            <div>
              <p className="font-medium">Erro ao carregar notificações</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <Button variant="outline" onClick={loadHistory}>
              <RefreshCw className="w-4 h-4 mr-2" /> Tentar novamente
            </Button>
          </div>
        ) : history.length === 0 ? (
          <div className="text-muted-foreground py-8 text-center text-sm">Nenhuma notificação enviada</div>
        ) : (
          <>
            {grouped.today.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Hoje ({grouped.today.length})</p>
                <NotificationList notifications={grouped.today} onMarkAsRead={handleMarkAsRead} onToggleRead={handleToggleRead} />
              </div>
            )}
            {grouped.yesterday.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Ontem ({grouped.yesterday.length})</p>
                <NotificationList notifications={grouped.yesterday} onMarkAsRead={handleMarkAsRead} onToggleRead={handleToggleRead} />
              </div>
            )}
            {grouped.last7Days.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Últimos 7 dias ({grouped.last7Days.length})</p>
                <NotificationList notifications={grouped.last7Days} onMarkAsRead={handleMarkAsRead} onToggleRead={handleToggleRead} />
              </div>
            )}
            {grouped.older.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Mais antigos ({grouped.older.length})</p>
                <NotificationList notifications={grouped.older} onMarkAsRead={handleMarkAsRead} onToggleRead={handleToggleRead} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
