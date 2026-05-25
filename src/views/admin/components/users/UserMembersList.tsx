import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { Building, ChevronLeft, ChevronRight, Pencil } from 'lucide-react'
import { EASE_OUT_QUINT, PAGE_SIZE } from './types'
import type { Member } from '@/hooks/infra/useSupabase'
import type { DbClientRow } from '@/types/db'

interface UserMembersListProps {
  reduced: boolean
  paginatedUsers: Member[]
  filteredCount: number
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  getUserClients: (userId: string) => DbClientRow[]
  onEditUser: (user: Member) => void
  searchQuery: string
  statusFilter: string
}

function UserStatusDot({ isDeactivated, hasGoogle }: { isDeactivated: boolean; hasGoogle: boolean }) {
  if (isDeactivated) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="h-2 w-2 rounded-full bg-border" />
        Inativo
      </span>
    )
  }
  if (hasGoogle) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        Ativo
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1.5 text-xs text-orange-600 dark:text-orange-400">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-60" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
      </span>
      Pendente
    </span>
  )
}

export function UserMembersList({
  reduced, paginatedUsers, filteredCount, page, totalPages,
  onPageChange, getUserClients, onEditUser, searchQuery, statusFilter,
}: UserMembersListProps) {
  if (filteredCount === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-muted-foreground">
          {searchQuery || statusFilter !== 'all'
            ? 'Nenhum membro corresponde ao filtro.'
            : 'Ainda não há membros. Crie o primeiro.'}
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto_auto] items-center px-4 py-2 bg-muted/50 border-b border-border">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Membro</span>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide w-28 text-center hidden sm:block">Clientes</span>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide w-24 text-center hidden md:block">Status</span>
          <span className="w-16" />
        </div>

        <AnimatePresence mode="popLayout">
          {paginatedUsers.map((u, i) => {
            const ucs = getUserClients(u.id)
            const hasGoogle = !!u.auth_user_id
            const isDeactivated = u.is_active === false
            const isAdmin = u.access_role === 'admin'

            return (
              <motion.div
                key={u.id}
                layout={!reduced}
                initial={reduced ? { opacity: 0 } : { opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, x: 8 }}
                transition={{ duration: 0.18, ease: EASE_OUT_QUINT, delay: reduced ? 0 : i * 0.025 }}
                className="group grid grid-cols-[1fr_auto_auto_auto] items-center px-4 py-3 border-b border-border/60 last:border-b-0 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-4">
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium overflow-hidden shrink-0">
                    {u.avatar_url
                      ? <img src={u.avatar_url} alt={u.name} className="w-full h-full object-cover" />
                      : u.name.charAt(0).toUpperCase()
                    }
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onEditUser(u)}
                        className="text-sm font-medium truncate hover:underline underline-offset-2 cursor-pointer text-left"
                        title={u.name}
                      >
                        {u.name}
                      </button>
                      {isAdmin && (
                        <span className="shrink-0 text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">Admin</span>
                      )}
                      {isDeactivated && (
                        <span className="shrink-0 text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">Desativado</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate mt-0.5">
                      {u.role}
                      {u.email && <span className="ml-2 opacity-70">{u.email}</span>}
                    </div>
                  </div>
                </div>

                <div className="w-28 text-center hidden sm:flex justify-center items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-sm tabular-nums">{ucs.length}</span>
                  {ucs.length > 0 && (
                    <span className="text-xs text-muted-foreground truncate max-w-[60px]" title={ucs.map(c => c.name).join(', ')}>
                      {ucs[0].name}{ucs.length > 1 ? ` +${ucs.length - 1}` : ''}
                    </span>
                  )}
                </div>

                <div className="w-24 hidden md:flex justify-center">
                  <UserStatusDot isDeactivated={isDeactivated} hasGoogle={hasGoogle} />
                </div>

                <div className="w-16 flex justify-end items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onEditUser(u)}
                    className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                    aria-label={`Editar ${u.name}`}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <span className="text-xs text-muted-foreground">
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredCount)} de {filteredCount}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page === 1} className="h-7 w-7 p-0">
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <span className="text-xs text-muted-foreground px-2 tabular-nums">{page} / {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="h-7 w-7 p-0">
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
