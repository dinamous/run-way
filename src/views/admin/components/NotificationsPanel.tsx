import { useState, useCallback, useEffect, useMemo } from 'react'
import { Send, Users, Building2, Globe, Clock, AlertTriangle, RefreshCw, Eye, EyeOff, UserCheck, UserX, ShieldCheck, ShieldOff, Megaphone, ClipboardList, MessageSquare } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkBreaks from 'remark-breaks'
import { Button, Input, Label } from '@/components/ui'
import { toast } from 'sonner'
import { supabaseAdmin } from '@/lib/supabase'
import { createNotification, createNotificationForClient, createNotificationForAll, fetchAllNotifications, markAsRead as markAsReadApi } from '@/lib/notifications'
import type { Member } from '@/hooks/useSupabase'
import type { Client } from '@/types/db'
import type { Notification } from '@/types/notification'

interface NotificationsPanelProps {
  clients: Client[]
  users: Member[]
}

type TargetType = 'user' | 'client' | 'all'

function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch { return '' }
}

function getNotificationTypeIcon(type: string): React.ReactNode {
  switch (type) {
    case 'step_assigned': return <UserCheck className="w-4 h-4 text-emerald-500" />
    case 'step_unassigned': return <UserX className="w-4 h-4 text-orange-500" />
    case 'role_changed': return <ShieldCheck className="w-4 h-4 text-violet-500" />
    case 'client_access_granted': return <ShieldCheck className="w-4 h-4 text-blue-500" />
    case 'client_access_revoked': return <ShieldOff className="w-4 h-4 text-destructive" />
    case 'admin_broadcast': return <Megaphone className="w-4 h-4 text-primary" />
    case 'manual': return <MessageSquare className="w-4 h-4 text-muted-foreground" />
    default: return <ClipboardList className="w-4 h-4 text-muted-foreground" />
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

function isToday(d: string) { return new Date(d).toDateString() === new Date().toDateString() }
function isYesterday(d: string) {
  const y = new Date(); y.setDate(y.getDate() - 1)
  return new Date(d).toDateString() === y.toDateString()
}
function isLast7Days(d: string) {
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 86400000)
  return diff >= 1 && diff <= 7
}

function groupNotifications(notifications: Notification[]) {
  const g = { today: [] as Notification[], yesterday: [] as Notification[], last7Days: [] as Notification[], older: [] as Notification[] }
  for (const n of notifications) {
    if (isToday(n.created_at)) g.today.push(n)
    else if (isYesterday(n.created_at)) g.yesterday.push(n)
    else if (isLast7Days(n.created_at)) g.last7Days.push(n)
    else g.older.push(n)
  }
  return g
}

function NotificationList({ notifications, onMarkAsRead, onToggleRead }: {
  notifications: Notification[]
  onMarkAsRead: (id: string) => void
  onToggleRead?: (id: string) => void
}) {
  if (notifications.length === 0) return null
  return (
    <div className="border rounded-lg divide-y">
      {notifications.map((notif) => (
        <div key={notif.id} className={`px-4 py-3 flex items-start gap-3 ${notif.read ? 'opacity-50 bg-muted/20' : 'bg-background'}`}>
          <div className="flex-shrink-0 mt-0.5">{getNotificationTypeIcon(notif.type)}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {!notif.read && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
              <span className={`font-medium ${notif.read ? 'font-normal' : 'font-semibold'}`}>{notif.title}</span>
              <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                {getNotificationTypeLabel(notif.type)}
              </span>
              {notif.read && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <EyeOff className="w-3 h-3" /> lida
                </span>
              )}
            </div>
            <div className="text-sm text-muted-foreground mt-1 prose prose-sm dark:prose-invert max-w-none [&_p]:mb-0 [&_strong]:text-foreground">
              <ReactMarkdown remarkPlugins={[remarkBreaks]}>{notif.message}</ReactMarkdown>
            </div>
            <span className="text-xs text-muted-foreground">{formatDate(notif.created_at)}</span>
          </div>
          <div className="flex items-center gap-1">
            {!notif.read ? (
              <button onClick={() => onMarkAsRead(notif.id)} className="p-1.5 rounded hover:bg-muted text-muted-foreground" title="Marcar como lida">
                <Eye className="w-4 h-4" />
              </button>
            ) : onToggleRead ? (
              <button onClick={() => onToggleRead(notif.id)} className="p-1.5 rounded hover:bg-muted text-muted-foreground" title="Marcar como não lida">
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
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedClientId, setSelectedClientId] = useState('')
  const [sending, setSending] = useState(false)
  const [messageTab, setMessageTab] = useState<'edit' | 'preview'>('edit')

  const [history, setHistory] = useState<Notification[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadHistory = useCallback(async () => {
    if (!supabaseAdmin) return
    setLoadingHistory(true)
    setError(null)
    try {
      setHistory(await fetchAllNotifications())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar')
    } finally {
      setLoadingHistory(false)
    }
  }, [])

  useEffect(() => { loadHistory() }, [loadHistory])

  const grouped = useMemo(() => groupNotifications(history), [history])

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) { toast.error('Preencha o título e a mensagem'); return }
    if (!supabaseAdmin) { toast.error('Admin não configurado'); return }

    setSending(true)
    try {
      if (targetType === 'user' && selectedUserId) {
        await createNotification(title, message, selectedUserId, undefined, 'manual')
      } else if (targetType === 'client' && selectedClientId) {
        await createNotificationForClient(selectedClientId, title, message)
      } else if (targetType === 'all') {
        await createNotificationForAll(clients.map((c) => c.id), title, message)
      } else {
        toast.error('Selecione um destino'); setSending(false); return
      }

      toast.success('Notificação enviada')
      setTitle('')
      setMessage('')
      setMessageTab('edit')
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
    } catch { toast.error('Erro ao marcar como lida') }
  }

  const handleToggleRead = async (id: string) => {
    try {
      await markAsReadApi(id)
      setHistory((prev) => prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n)))
    } catch { toast.error('Erro ao atualizar') }
  }

  const activeUsers = users.filter((u) => u.is_active !== false)

  const targets: { key: TargetType; label: string; icon: React.ReactNode; description: string }[] = [
    { key: 'user', label: 'Usuário', icon: <Users className="w-4 h-4" />, description: 'Um membro específico' },
    { key: 'client', label: 'Cliente', icon: <Building2 className="w-4 h-4" />, description: 'Todos de um cliente' },
    { key: 'all', label: 'Todos', icon: <Globe className="w-4 h-4" />, description: `${clients.length} clientes` },
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(90vh-13rem)]">
      {/* Formulário */}
      <div className="flex flex-col gap-5 overflow-y-auto pr-1">
        <div className="flex items-center gap-2">
          <Send className="w-4 h-4" />
          <h2 className="text-base font-semibold">Enviar Notificação</h2>
        </div>

        {/* Destino */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Destino</Label>
          <div className="grid grid-cols-3 gap-2">
            {targets.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTargetType(t.key)}
                className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-lg border text-sm font-medium transition-colors ${
                  targetType === t.key
                    ? 'border-primary bg-primary/8 text-primary'
                    : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
                }`}
              >
                {t.icon}
                <span>{t.label}</span>
                <span className="text-[10px] font-normal opacity-70">{t.description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Seletor condicional */}
        {targetType === 'user' && (
          <div className="space-y-2">
            <Label>Usuário</Label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
            >
              <option value="">Selecione um usuário...</option>
              {activeUsers.map((u) => (
                <option key={u.id} value={u.id}>{u.name || u.email}</option>
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
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
            >
              <option value="">Selecione um cliente...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}

        {targetType === 'all' && (
          <div className="px-3 py-2.5 rounded-lg border border-border bg-muted/40 text-sm text-muted-foreground">
            Será enviado como broadcast para todos os {clients.length} clientes cadastrados.
          </div>
        )}

        {/* Título */}
        <div className="space-y-2">
          <Label>Título</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Atualização importante" />
        </div>

        {/* Mensagem com tabs */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Mensagem</Label>
            <div className="flex border border-border rounded-md overflow-hidden text-xs">
              <button
                type="button"
                onClick={() => setMessageTab('edit')}
                className={`px-3 py-1 transition-colors ${messageTab === 'edit' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Editar
              </button>
              <button
                type="button"
                onClick={() => setMessageTab('preview')}
                className={`px-3 py-1 transition-colors ${messageTab === 'preview' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Preview
              </button>
            </div>
          </div>
          {messageTab === 'edit' ? (
            <textarea
              value={message}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)}
              placeholder="Suporta markdown: **negrito**, _itálico_, quebras de linha..."
              rows={5}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground resize-none font-mono text-sm"
            />
          ) : (
            <div className="w-full min-h-[120px] px-3 py-2 rounded-lg border border-border bg-muted/30 text-sm prose prose-sm dark:prose-invert max-w-none [&_p]:mb-1 [&_p:last-child]:mb-0">
              {message.trim()
                ? <ReactMarkdown remarkPlugins={[remarkBreaks]}>{message}</ReactMarkdown>
                : <span className="text-muted-foreground italic">Nada para visualizar</span>
              }
            </div>
          )}
          <p className="text-xs text-muted-foreground">Suporta Markdown: **negrito**, _itálico_, quebras de linha</p>
        </div>

        <Button onClick={handleSend} disabled={sending} className="w-full">
          {sending ? 'Enviando...' : <><Send className="w-4 h-4 mr-2" />Enviar notificação</>}
        </Button>
      </div>

      {/* Histórico */}
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
    </div>
  )
}
