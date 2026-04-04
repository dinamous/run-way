import { useState } from 'react'
import { useAdminData } from './hooks/useAdminData'
import { ClientsPanel } from './components/ClientsPanel'
import { UsersPanel } from './components/UsersPanel'
import { AuditLogsPanel } from './components/AuditLogsPanel'
import { useAuthContext } from '@/contexts/AuthContext'

type AdminTab = 'clients' | 'users' | 'audit'

export function AdminView() {
  const [tab, setTab] = useState<AdminTab>('clients')
  const { impersonatedClientId, setImpersonatedClientId } = useAuthContext()
  const {
    clients, users, auditLogs, loading,
    fetchAuditLogs,
    createClient, deleteClient,
    linkUserToClient, unlinkUserFromClient, setUserRole,
  } = useAdminData()

  // Mapear userId → clientIds a partir dos user_clients
  // useAdminData não carrega isso diretamente — vamos enriquecer os users
  // com os clientes deles via consulta adicional
  const userClientsMap: Record<string, string[]> = {}
  // (populado por useAdminData quando adicionarmos esse fetch — por ora vazio)

  const tabs: { key: AdminTab; label: string }[] = [
    { key: 'clients', label: 'Clientes' },
    { key: 'users', label: 'Usuários' },
    { key: 'audit', label: 'Audit Log' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Painel Admin</h1>
        {impersonatedClientId && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg text-sm">
            <span>Visualizando como cliente</span>
            <button
              className="text-yellow-700 dark:text-yellow-400 font-medium hover:underline"
              onClick={() => setImpersonatedClientId(null)}
            >
              Sair da visão
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      <div>
        {tab === 'clients' && (
          <ClientsPanel
            clients={clients}
            onCreate={createClient}
            onDelete={deleteClient}
            onImpersonate={setImpersonatedClientId}
            impersonatedClientId={impersonatedClientId}
          />
        )}
        {tab === 'users' && (
          <UsersPanel
            users={users}
            clients={clients}
            onSetRole={setUserRole}
            onLink={linkUserToClient}
            onUnlink={unlinkUserFromClient}
            userClientsMap={userClientsMap}
          />
        )}
        {tab === 'audit' && (
          <AuditLogsPanel
            logs={auditLogs}
            clients={clients}
            users={users}
            loading={loading}
            onFetch={fetchAuditLogs}
          />
        )}
      </div>
    </div>
  )
}
