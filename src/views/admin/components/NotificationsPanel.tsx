import { useState, useCallback, useEffect, useMemo } from 'react'
import { Send, Users, Building2, Clock, AlertTriangle, RefreshCw, Eye, EyeOff } from 'lucide-react'
import { Button, Input, Label } from '@/components/ui'
import { toast } from 'sonner'
import { supabaseAdmin } from '@/lib/supabase'
import { createNotification, createNotificationForClient, fetchAllNotifications, markAsRead as markAsReadApi } from '@/lib/notifications'
import type { Member } from '@/hooks/useSupabase'
import type { Client } from '@/types/db'
import type { Notification } from '@/types/notification'

interface NotificationsPanelProps {
  clients: Client[]
  users: Member[]
}

type TargetType = 'user' | 'client'

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

function getNotificationTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    step_assigned: 'Etapa atribuída',
    step_unassigned: 'Etapa removida',
    role_changed: 'Cargo alterado',
    client_access_granted: 'Acesso concedido',
    client_access_revoked: 'Acesso revogado',
    admin_broadcast: 'Broadcast',
    manual: 'Manual',
  }
  return labels[type] || type
}

function isToday(dateString: string): boolean {
  const date = new Date(dateString)
  const today = new Date()
  return date.toDateString() === today.toDateString()
}

function isYesterday(dateString: string): boolean {
  const date = new Date(dateString)
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return date.toDateString() === yesterday.toDateString()
}

function isLast7Days(dateString: string): boolean {
  const date = new Date(dateString)
  const today = new Date()
  const diffDays = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  return diffDays >= 1 && diffDays <= 7
}

interface GroupedNotifications {
  today: Notification[]
  yesterday: Notification[]
  last7Days: Notification[]
  older: Notification[]
}

function groupNotifications(notifications: Notification[]): GroupedNotifications {
  const grouped: GroupedNotifications = {
    today: [],
    yesterday: [],
    last7Days: [],
    older: [],
  }

  for (const notif of notifications) {
    if (isToday(notif.created_at)) {
      grouped.today.push(notif)
    } else if (isYesterday(notif.created_at)) {
      grouped.yesterday.push(notif)
    } else if (isLast7Days(notif.created_at)) {
      grouped.last7Days.push(notif)
    } else {
      grouped.older.push(notif)
    }
  }

  return grouped
}

function NotificationList({
  notifications,
  onMarkAsRead,
  onToggleRead,
}: {
  notifications: Notification[]
  onMarkAsRead: (id: string) => void
  onToggleRead?: (id: string) => void
}) {
  if (notifications.length === 0) return null

  return (
    <div className="border rounded-lg divide-y">
      {notifications.map((notif) => (
        <div
          key={notif.id}
          className={`px-4 py-3 flex items-start gap-3 ${notif.read ? 'opacity-50 bg-muted/20' : 'bg-background'}`}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {!notif.read && (
                <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
              )}
              <span className={`font-medium ${notif.read ? 'font-normal' : 'font-semibold'}`}>
                {notif.title}
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                {getNotificationTypeLabel(notif.type)}
              </span>
              {notif.read && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <EyeOff className="w-3 h-3" /> lida
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">{notif.message}</p>
            <span className="text-xs text-muted-foreground">
              {formatDate(notif.created_at)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {!notif.read ? (
              <button
                onClick={() => onMarkAsRead(notif.id)}
                className="p-1.5 rounded hover:bg-muted text-muted-foreground flex items-center gap-1 text-xs"
                title="Marcar como lida"
              >
                <Eye className="w-4 h-4" />
              </button>
            ) : onToggleRead ? (
              <button
                onClick={() => onToggleRead(notif.id)}
                className="p-1.5 rounded hover:bg-muted text-muted-foreground flex items-center gap-1 text-xs"
                title="Marcar como não lida"
              >
                <EyeOff className="w-4 h-4" />
              </button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  )
}

export function NotificationsPanel({ clients, users }: NotificationsPanelProps) {
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [targetType, setTargetType] = useState<TargetType>('user')
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [sending, setSending] = useState(false)

  const [history, setHistory] = useState<Notification[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadHistory = useCallback(async () => {
    if (!supabaseAdmin) return
    setLoadingHistory(true)
    setError(null)
    try {
      const data = await fetchAllNotifications()
      setHistory(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar')
    } finally {
      setLoadingHistory(false)
    }
  }, [])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  const grouped = useMemo(() => groupNotifications(history), [history])

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error('Preencha o título e a mensagem')
      return
    }

    if (!supabaseAdmin) {
      toast.error('Admin não configurado')
      return
    }

    setSending(true)

    try {
      if (targetType === 'user' && selectedUserId) {
        await createNotification(title, message, selectedUserId, undefined, 'manual')
      } else if (targetType === 'client' && selectedClientId) {
        await createNotificationForClient(selectedClientId, title, message)
      }

      toast.success('Notificação enviada')
      setTitle('')
      setMessage('')
      await loadHistory()
    } catch {
      toast.error('Erro ao enviar notificação')
    } finally {
      setSending(false)
    }
  }

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsReadApi(id)
      setHistory((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    } catch {
      toast.error('Erro ao marcar como lida')
    }
  }

  const handleToggleRead = async (id: string) => {
    const notification = history.find((n) => n.id === id)
    if (!notification) return

    try {
      await markAsReadApi(id)
      setHistory((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n))
      )
    } catch {
      toast.error('Erro ao atualizar')
    }
  }

  const activeUsers = users.filter((u) => u.is_active !== false)

  const hasNotifications = history.length > 0

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Send className="w-5 h-5" />
          <h2 className="text-lg font-semibold">Enviar Notificação</h2>
        </div>

        <div className="grid gap-4 max-w-lg">
          <div className="space-y-2">
            <Label>Tipo de destino</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTargetType('user')}
                className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  targetType === 'user'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                <Users className="w-4 h-4 mx-auto mb-1" />
                Usuário
              </button>
              <button
                type="button"
                onClick={() => setTargetType('client')}
                className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  targetType === 'client'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                <Building2 className="w-4 h-4 mx-auto mb-1" />
                Cliente
              </button>
            </div>
          </div>

          {targetType === 'user' && (
            <div className="space-y-2">
              <Label>Usuário ({activeUsers.length} disponíveis)</Label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
              >
                <option value="">Selecione um usuário...</option>
                {activeUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name || user.email}
                  </option>
                ))}
              </select>
            </div>
          )}

          {targetType === 'client' && (
            <div className="space-y-2">
              <Label>Cliente</Label>
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
              >
                <option value="">Selecione um cliente...</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Título</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Atualização importante"
            />
          </div>

          <div className="space-y-2">
            <Label>Mensagem</Label>
            <textarea
              value={message}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)}
              placeholder="Digite a mensagem..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground resize-none"
            />
          </div>

          <Button onClick={handleSend} disabled={sending} className="w-full">
            {sending ? (
              'Enviando...'
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Enviar notificação
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Histórico de Notificações</h2>
          </div>
          <Button variant="outline" size="sm" onClick={loadHistory} disabled={loadingHistory}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loadingHistory ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        {loadingHistory && !error ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Carregando...
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-4 py-8 px-4 text-center border border-destructive/20 rounded-lg">
            <AlertTriangle className="w-8 h-8 text-destructive" />
            <div>
              <p className="font-medium">Erro ao carregar notificações</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <Button variant="outline" onClick={loadHistory}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Tentar novamente
            </Button>
          </div>
        ) : !hasNotifications ? (
          <div className="text-muted-foreground py-8 text-center">Nenhuma notificação enviada</div>
        ) : (
          <div className="space-y-6">
            {grouped.today.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Hoje ({grouped.today.length})</h3>
                <NotificationList
                  notifications={grouped.today}
                  onMarkAsRead={handleMarkAsRead}
                  onToggleRead={handleToggleRead}
                />
              </div>
            )}

            {grouped.yesterday.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Ontem ({grouped.yesterday.length})</h3>
                <NotificationList
                  notifications={grouped.yesterday}
                  onMarkAsRead={handleMarkAsRead}
                  onToggleRead={handleToggleRead}
                />
              </div>
            )}

            {grouped.last7Days.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Últimos 7 dias ({grouped.last7Days.length})</h3>
                <NotificationList
                  notifications={grouped.last7Days}
                  onMarkAsRead={handleMarkAsRead}
                  onToggleRead={handleToggleRead}
                />
              </div>
            )}

            {grouped.older.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Mais antigos ({grouped.older.length})</h3>
                <NotificationList
                  notifications={grouped.older}
                  onMarkAsRead={handleMarkAsRead}
                  onToggleRead={handleToggleRead}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}