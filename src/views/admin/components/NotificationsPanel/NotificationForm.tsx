import { Send, Users, Building2, Globe } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkBreaks from 'remark-breaks'
import { Button, Input, Label } from '@/components/ui'
import type { Member } from '@/hooks/useSupabase'
import type { Client } from '@/types/db'
import type { TargetType, UseNotificationsPanelReturn } from './useNotificationsPanel'

type Props = Pick<UseNotificationsPanelReturn,
  | 'title' | 'setTitle'
  | 'message' | 'setMessage'
  | 'targetType' | 'setTargetType'
  | 'selectedUserId' | 'setSelectedUserId'
  | 'selectedClientId' | 'setSelectedClientId'
  | 'sending'
  | 'messageTab' | 'setMessageTab'
  | 'handleSend'
> & { clients: Client[]; users: Member[] }

const TARGET_META: { key: TargetType; label: string; icon: React.ReactNode; descFn: (c: Client[], u: Member[]) => string }[] = [
  { key: 'user', label: 'Usuário', icon: <Users className="w-4 h-4" />, descFn: () => 'Um membro específico' },
  { key: 'client', label: 'Cliente', icon: <Building2 className="w-4 h-4" />, descFn: () => 'Todos de um cliente' },
  { key: 'all', label: 'Todos', icon: <Globe className="w-4 h-4" />, descFn: (c) => `${c.length} clientes` },
]

export function NotificationForm({
  title, setTitle, message, setMessage,
  targetType, setTargetType,
  selectedUserId, setSelectedUserId,
  selectedClientId, setSelectedClientId,
  sending, messageTab, setMessageTab,
  handleSend, clients, users,
}: Props) {
  const activeUsers = users.filter((u) => u.is_active !== false)

  return (
    <div className="flex flex-col gap-5 overflow-y-auto pr-1">
      <div className="flex items-center gap-2">
        <Send className="w-4 h-4" />
        <h2 className="text-base font-semibold">Enviar Notificação</h2>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Destino</Label>
        <div className="grid grid-cols-3 gap-2">
          {TARGET_META.map((t) => (
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
              <span className="text-[10px] font-normal opacity-70">{t.descFn(clients, users)}</span>
            </button>
          ))}
        </div>
      </div>

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

      <div className="space-y-2">
        <Label>Título</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Atualização importante" />
      </div>

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
  )
}
