import { useState } from 'react'
import { useAdminData } from './hooks/useAdminData'
import { ClientsPanel } from './components/ClientsPanel'
import { UsersPanel } from './components/UsersPanel'
import { AuditLogsPanel } from './components/AuditLogsPanel'
import { useAuthContext } from '@/contexts/AuthContext'
import { supabaseAdmin } from '@/lib/supabase'

type AdminTab = 'clients' | 'users' | 'audit'

export function AdminView() {
  const [tab, setTab] = useState<AdminTab>('clients')
  const { impersonatedClientId, setImpersonatedClientId } = useAuthContext()
  const {
    clients, users, auditLogs, loading, userClientsMap,
    fetchAuditLogs,
    createClient, updateClient, deleteClient,
    linkUserToClient, unlinkUserFromClient, setUserRole,
    createUser, setUserAuthId, listGoogleUsers,
  } = useAdminData()

  if (!supabaseAdmin) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Painel Admin</h1>
        <div className="p-6 border border-yellow-200 dark:border-yellow-800 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
          <h2 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
            Configuração necessária
          </h2>
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            Para acessar o painel admin, configure a variável de ambiente{' '}
            <code className="px-1 py-0.5 bg-yellow-100 dark:bg-yellow-800 rounded text-xs">VITE_SUPABASE_SERVICE_ROLE_KEY</code>{' '}
            no arquivo{' '}
            <code className="px-1 py-0.5 bg-yellow-100 dark:bg-yellow-800 rounded text-xs">.env.local</code>.
          </p>
          <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-2">
            Esta chave permite bypassar as políticas RLS para operações de admin.
          </p>
        </div>
      </div>
    )
  }

  const tabs: { key: AdminTab; label: string; count?: number }[] = [
    { key: 'clients', label: 'Clientes', count: clients.length },
    { key: 'users', label: 'Usuários', count: users.length },
    { key: 'audit', label: 'Audit Log', count: auditLogs.length },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Painel Admin</h1>
        {impersonatedClientId && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center gap-2 px-3 py-1.5 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg text-sm"
          >
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

      <div role="tablist" aria-label="Painel Admin abas" className="flex gap-1 border-b">
        {tabs.map(t => (
          <button
            key={t.key}
            id={`admin-tab-${t.key}`}
            role="tab"
            aria-selected={tab === t.key}
            aria-controls={`admin-panel-${t.key}`}
            tabIndex={tab === t.key ? 0 : -1}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-2 ${
              tab === t.key
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
            {t.count !== undefined && (
              <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="pt-4" role="region" aria-label="Conteúdo do Painel Admin">
        {tab === 'clients' && (
          <div id="admin-panel-clients" role="tabpanel" aria-labelledby="admin-tab-clients">
            <ClientsPanel
              clients={clients}
              users={users}
              userClientsMap={userClientsMap}
              onCreate={createClient}
              onUpdate={updateClient}
              onDelete={deleteClient}
              onLinkUser={linkUserToClient}
              onUnlinkUser={unlinkUserFromClient}
            />
          </div>
        )}
        {tab === 'users' && (
          <div id="admin-panel-users" role="tabpanel" aria-labelledby="admin-tab-users">
            <UsersPanel
              users={users}
              clients={clients}
              onSetRole={setUserRole}
              onLink={linkUserToClient}
              onUnlink={unlinkUserFromClient}
              onCreate={createUser}
              onSetAuthId={setUserAuthId}
              onListGoogleUsers={listGoogleUsers}
              userClientsMap={userClientsMap}
            />
          </div>
        )}
        {tab === 'audit' && (
          <div id="admin-panel-audit" role="tabpanel" aria-labelledby="admin-tab-audit">
            <AuditLogsPanel
              logs={auditLogs}
              clients={clients}
              users={users}
              loading={loading}
              onFetch={fetchAuditLogs}
            />
          </div>
        )}
      </div>
    </div>
  )
}
