import { useState } from 'react'
import { useAdminData } from './hooks/useAdminData'
import { ClientsPanel } from './components/ClientsPanel'
import { UsersPanel } from './components/UsersPanel'
import { AuditLogsPanel } from './components/AuditLogsPanel'
import { useAuthContext } from '@/contexts/AuthContext'
import { supabaseAdmin } from '@/lib/supabase'
import { ViewState } from '@/components/ViewState'
import { DatabaseZap, ShieldAlert } from 'lucide-react'
import { Skeleton } from 'boneyard-js/react'

const ADMIN_BONES = {
  name: 'admin-view',
  viewportWidth: 1280,
  width: 1100,
  height: 640,
  bones: [
    { x: 0, y: 0, w: 28, h: 34, r: 8 },
    { x: 0, y: 52, w: 45, h: 36, r: 8 },
    { x: 0, y: 108, w: 100, h: 510, r: 12 },
  ],
}

type AdminTab = 'clients' | 'users' | 'audit'

export function AdminView() {
  const [tab, setTab] = useState<AdminTab>('clients')
  const { member, impersonatedClientId, setImpersonatedClientId } = useAuthContext()
  const {
    clients, users, auditLogs, loading, loadingInitial, error, userClientsMap, pendingUsers,
    refreshAll,
    fetchAuditLogs,
    createClient, updateClient, deleteClient,
    linkUserToClient, unlinkUserFromClient, setUserRole,
    createUser, setUserAuthId, updateUser, listGoogleUsers,
  } = useAdminData({ actorUserId: member?.id ?? null })

  if (!supabaseAdmin) {
    return (
      <ViewState
        icon={ShieldAlert}
        title="Configuração necessária"
        description="Para acessar o painel admin, configure VITE_SUPABASE_SERVICE_ROLE_KEY no .env.local."
      />
    )
  }

  if (error && clients.length === 0 && users.length === 0) {
    return (
      <ViewState
        icon={DatabaseZap}
        title="Erro ao carregar painel admin"
        description={`Não foi possível consultar o banco agora. Detalhe: ${error}`}
        actionLabel="Tentar novamente"
        onAction={refreshAll}
      />
    )
  }

  const tabs: { key: AdminTab; label: string; count?: number }[] = [
    { key: 'clients', label: 'Clientes', count: clients.length },
    { key: 'users', label: 'Usuários', count: users.length },
    { key: 'audit', label: 'Audit Log', count: auditLogs.length },
  ]

  const content = (
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
              onUpdate={updateUser}
              onSetAuthId={setUserAuthId}
              onListGoogleUsers={listGoogleUsers}
              userClientsMap={userClientsMap}
              pendingUsers={pendingUsers}
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

  return (
    <Skeleton loading={loadingInitial} initialBones={ADMIN_BONES} animate="shimmer">
      {content}
    </Skeleton>
  )
}
