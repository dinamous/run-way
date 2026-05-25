import { useState, useMemo, useCallback } from 'react'
import { AnimatePresence, useReducedMotion } from 'framer-motion'
import type { Member } from '@/hooks/infra/useSupabase'
import type { PendingAuthUser } from '../hooks/useAdminData'
import type { StatusFilter, CurrentTab, UsersPanelProps } from './users/types'
import { PAGE_SIZE } from './users/types'
import { UsersPanelToolbar } from './users/UsersPanelToolbar'
import { UserCreateForm } from './users/UserCreateForm'
import { UserMembersList } from './users/UserMembersList'
import { PendingUsersList } from './users/PendingUsersList'
import { UserEditDrawer } from './users/UserEditDrawer'
import { LinkUserDrawer } from './users/LinkUserDrawer'

export function UsersPanel({
  users, clients, onSetRole, onLink, onUnlink, onCreate, onUpdate,
  onSetAuthId, onListGoogleUsers, onDeactivate, onReactivate,
  userClientsMap, pendingUsers,
}: UsersPanelProps) {
  const reduced = useReducedMotion() ?? false

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [page, setPage] = useState(1)
  const [currentTab, setCurrentTab] = useState<CurrentTab>('members')

  const [createOpen, setCreateOpen] = useState(false)
  const [createFromPending, setCreateFromPending] = useState<PendingAuthUser | null>(null)

  const [editingUser, setEditingUser] = useState<Member | null>(null)

  const [linkingPendingUser, setLinkingPendingUser] = useState<PendingAuthUser | null>(null)
  const [linkDrawerOpen, setLinkDrawerOpen] = useState(false)

  const filteredUsers = useMemo(() => {
    let filtered = users
    if (statusFilter === 'deactivated') {
      filtered = filtered.filter(u => u.is_active === false)
    } else {
      filtered = filtered.filter(u => u.is_active !== false)
      if (statusFilter === 'active') filtered = filtered.filter(u => !!u.auth_user_id)
      else if (statusFilter === 'pending') filtered = filtered.filter(u => !u.auth_user_id)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(u =>
        u.name.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
      )
    }
    return filtered
  }, [users, searchQuery, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE))
  const paginatedUsers = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filteredUsers.slice(start, start + PAGE_SIZE)
  }, [filteredUsers, page])

  const getUserClients = useCallback((userId: string) => {
    const clientIds = userClientsMap[userId] ?? []
    return clients.filter(c => clientIds.includes(c.id))
  }, [clients, userClientsMap])

  const handleTabChange = (tab: CurrentTab) => { setCurrentTab(tab); setPage(1) }
  const handleStatusFilter = (f: StatusFilter) => { setStatusFilter(f); setPage(1) }
  const handleSearch = (v: string) => { setSearchQuery(v); setPage(1) }

  const openCreate = (pending?: PendingAuthUser) => {
    setCreateFromPending(pending ?? null)
    setCreateOpen(true)
  }

  const closeCreate = () => {
    setCreateOpen(false)
    setCreateFromPending(null)
  }

  const handleCreated = () => {
    closeCreate()
    if (linkDrawerOpen) { setLinkDrawerOpen(false); setLinkingPendingUser(null) }
  }

  const handleLinkClick = (pending: PendingAuthUser) => {
    setLinkingPendingUser(pending)
    setLinkDrawerOpen(true)
  }

  const handleCreateFromPending = (pending: PendingAuthUser) => {
    setLinkDrawerOpen(false)
    openCreate(pending)
  }

  return (
    <div className="space-y-0">
      <UsersPanelToolbar
        searchQuery={searchQuery}
        onSearchChange={handleSearch}
        currentTab={currentTab}
        onTabChange={handleTabChange}
        statusFilter={statusFilter}
        onStatusFilterChange={handleStatusFilter}
        pendingCount={pendingUsers.length}
        filteredCount={filteredUsers.length}
        onCreateClick={() => openCreate()}
      />

      <AnimatePresence>
        {createOpen && currentTab === 'members' && (
          <UserCreateForm
            reduced={reduced}
            createFromPendingUser={createFromPending}
            onListGoogleUsers={onListGoogleUsers}
            onCreate={onCreate}
            onClose={closeCreate}
            onCreated={handleCreated}
          />
        )}
      </AnimatePresence>

      {currentTab === 'pending' && (
        <PendingUsersList
          reduced={reduced}
          pendingUsers={pendingUsers}
          onLinkClick={handleLinkClick}
        />
      )}

      {currentTab === 'members' && (
        <UserMembersList
          reduced={reduced}
          paginatedUsers={paginatedUsers}
          filteredCount={filteredUsers.length}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          getUserClients={getUserClients}
          onEditUser={setEditingUser}
          searchQuery={searchQuery}
          statusFilter={statusFilter}
        />
      )}

      <UserEditDrawer
        open={!!editingUser}
        user={editingUser}
        clients={clients}
        editClients={editingUser ? (userClientsMap[editingUser.id] ?? []) : []}
        userClientsMap={userClientsMap}
        initialEditClients={editingUser ? (userClientsMap[editingUser.id] ?? []) : []}
        onClose={() => setEditingUser(null)}
        onSetRole={onSetRole}
        onLink={onLink}
        onUnlink={onUnlink}
        onUpdate={onUpdate}
        onSetAuthId={onSetAuthId}
        onListGoogleUsers={onListGoogleUsers}
        onDeactivate={onDeactivate}
        onReactivate={onReactivate}
      />

      <LinkUserDrawer
        open={linkDrawerOpen}
        pendingUser={linkingPendingUser}
        members={users}
        onClose={() => { setLinkDrawerOpen(false); setLinkingPendingUser(null) }}
        onSetAuthId={onSetAuthId}
        onCreateFromPending={handleCreateFromPending}
      />
    </div>
  )
}
