import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { DbAuditLogRow } from '@/types/db'
import type { DbClientRow } from '@/types/db'
import type { Member } from '@/hooks/useSupabase'
import type { AuditFilters } from '../hooks/useAdminData'

interface AuditLogsPanelProps {
  logs: DbAuditLogRow[]
  clients: DbClientRow[]
  users: Member[]
  loading: boolean
  onFetch: (filters: AuditFilters) => void
}

export function AuditLogsPanel({ logs, clients, users, loading, onFetch }: AuditLogsPanelProps) {
  const [clientId, setClientId] = useState('')
  const [userId, setUserId] = useState('')
  const [entity, setEntity] = useState('')
  const [entityName, setEntityName] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const handleSearch = () => {
    onFetch({
      clientId: clientId || undefined,
      userId: userId || undefined,
      entity: entity || undefined,
      entityName: entityName || undefined,
      from: from || undefined,
      to: to || undefined,
    })
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Audit Log</h2>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-end">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Cliente</span>
          <select
            className="border rounded px-2 py-1 text-sm bg-background"
            value={clientId}
            onChange={e => setClientId(e.target.value)}
          >
            <option value="">Todos</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Usuário</span>
          <select
            className="border rounded px-2 py-1 text-sm bg-background"
            value={userId}
            onChange={e => setUserId(e.target.value)}
          >
            <option value="">Todos</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Entidade</span>
          <select
            className="border rounded px-2 py-1 text-sm bg-background"
            value={entity}
            onChange={e => setEntity(e.target.value)}
          >
            <option value="">Todas</option>
            <option value="task">task</option>
            <option value="step">step</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Demanda</span>
          <Input
            placeholder="Nome da demanda"
            value={entityName}
            onChange={e => setEntityName(e.target.value)}
            className="w-40 h-8 text-sm"
          />
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">De</span>
          <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-36 h-8 text-sm" />
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Até</span>
          <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-36 h-8 text-sm" />
        </div>

        <Button size="sm" onClick={handleSearch} disabled={loading}>
          {loading ? 'Buscando…' : 'Buscar'}
        </Button>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b text-left text-muted-foreground text-xs">
              <th className="py-2 pr-3">Data/Hora</th>
              <th className="py-2 pr-3">Usuário</th>
              <th className="py-2 pr-3">Demanda</th>
              <th className="py-2 pr-3">Entidade</th>
              <th className="py-2 pr-3">Ação</th>
              <th className="py-2 pr-3">Campo</th>
              <th className="py-2">De → Para</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 && (
              <tr><td colSpan={7} className="py-4 text-center text-muted-foreground">Nenhum registro encontrado</td></tr>
            )}
            {logs.map(log => {
              const user = users.find(u => u.id === log.user_id)
              return (
                <tr key={log.id} className="border-b hover:bg-muted/30">
                  <td className="py-1.5 pr-3 whitespace-nowrap text-xs">
                    {new Date(log.created_at).toLocaleString('pt-BR')}
                  </td>
                  <td className="py-1.5 pr-3">{user?.name ?? '—'}</td>
                  <td className="py-1.5 pr-3 max-w-[180px] truncate">{log.entity_name ?? '—'}</td>
                  <td className="py-1.5 pr-3">{log.entity}</td>
                  <td className="py-1.5 pr-3">
                    <span className={
                      log.action === 'create' ? 'text-green-600' :
                      log.action === 'delete' ? 'text-red-600' : 'text-yellow-600'
                    }>
                      {log.action}
                    </span>
                  </td>
                  <td className="py-1.5 pr-3 text-muted-foreground">{log.field ?? '—'}</td>
                  <td className="py-1.5 text-xs">
                    {log.from_value || log.to_value
                      ? <span>{log.from_value ?? '∅'} → {log.to_value ?? '∅'}</span>
                      : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
