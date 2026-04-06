import React from 'react'
import { useState } from 'react'
import { useAdminData } from './hooks/useAdminData'
import { ClientsPanel } from './components/ClientsPanel'
import { UsersPanel } from './components/UsersPanel'
import { AuditLogsPanel } from './components/AuditLogsPanel'
import { useAuthContext } from '@/contexts/AuthContext'
import { supabaseAdmin } from '@/lib/supabase'

type AdminTab = 'clients' | 'users' | 'audit'

type RightDrawerProps = {
  open: boolean
  onClose: () => void
  title?: string
  children?: React.ReactNode
}

const RightDrawer = ({ open, onClose, title, children }: RightDrawerProps) => (
  <aside
    id="admin-right-drawer"
    role="dialog"
    aria-modal="true"
    aria-label={title ?? 'Resumo'}
    className={`fixed top-0 right-0 h-full w-96 bg-white dark:bg-slate-800 border-l border-gray-200 dark:border-gray-700 shadow-xl z-50 transform transition-transform duration-300 ${
      open ? 'translate-x-0' : 'translate-x-full'
    }`}
    aria-hidden={!open}
  >
    <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
      <h2 className="text-lg font-semibold">{title ?? 'Resumo'}</h2>
      <button
        onClick={onClose}
        aria-label="Fechar painel de resumo"
        className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
      </button>
    </div>
    <div className="p-4 overflow-y-auto h-full">{children}</div>
  </aside>
)

export function AdminView() {
  const [tab, setTab] = useState<AdminTab>('clients')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { impersonatedClientId, setImpersonatedClientId } = useAuthContext()
  const {
    clients, users, auditLogs, loading, userClientsMap,
    fetchAuditLogs,
    createClient, updateClient, deleteClient,
    linkUserToClient, unlinkUserFromClient, setUserRole,
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

  const tabs: { key: AdminTab; label: string }[] = [
    { key: 'clients', label: 'Clientes' },
    { key: 'users', label: 'Usuários' },
    { key: 'audit', label: 'Audit Log' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Painel Admin</h1>
        <div className="flex items-center gap-2">
          <button
            id="admin-drawer-toggle"
            aria-controls="admin-right-drawer"
            aria-expanded={drawerOpen}
            aria-label="Abrir painel de resumo"
            onClick={() => setDrawerOpen(true)}
            className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Resumo
          </button>
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

      <RightDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Resumo do Painel Admin">
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
          <div className="p-3 bg-muted rounded-lg">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">Clientes</span>
            <p className="text-2xl font-bold mt-1">{clients?.length ?? 0}</p>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">Usuários</span>
            <p className="text-2xl font-bold mt-1">{users?.length ?? 0}</p>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">Audit Logs</span>
            <p className="text-2xl font-bold mt-1">{auditLogs?.length ?? 0}</p>
          </div>
          <div className="p-3 bg-muted rounded-lg flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${loading ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`} />
            <span className="text-xs text-muted-foreground">Status de carregamento</span>
          </div>
        </div>
      </RightDrawer>
    </div>
  )
}
