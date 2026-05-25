import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { Users, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import type { DbClientRow } from '@/types/db'
import type { Member } from '@/hooks/infra/useSupabase'
import { PAGE_SIZE, EASE_OUT_QUINT } from './clientUtils'

interface ClientListProps {
  clients: DbClientRow[]
  page: number
  totalPages: number
  deletingId: string | null
  getClientUsers: (id: string) => Member[]
  getPendingUsers: (id: string) => Member[]
  onPageChange: (p: number) => void
  onEdit: (c: DbClientRow) => void
  onDeleteRequest: (c: DbClientRow) => void
  searchQuery: string
  statusFilter: string
}

function ClientStatusDot({ hasPending, isActive }: { hasPending: boolean; isActive: boolean }) {
  if (hasPending) return (
    <span className="flex items-center gap-1.5 text-xs text-orange-600 dark:text-orange-400">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-60" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
      </span>
      Pendente
    </span>
  )
  if (isActive) return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className="h-2 w-2 rounded-full bg-emerald-500" />
      Ativo
    </span>
  )
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className="h-2 w-2 rounded-full bg-border" />
      Sem usuários
    </span>
  )
}

export function ClientList({
  clients, page, totalPages, deletingId,
  getClientUsers, getPendingUsers,
  onPageChange, onEdit, onDeleteRequest,
  searchQuery, statusFilter,
}: ClientListProps) {
  const reduced = useReducedMotion()
  const start = (page - 1) * PAGE_SIZE
  const paginated = clients.slice(start, start + PAGE_SIZE)

  if (clients.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-muted-foreground">
          {searchQuery || statusFilter !== 'all'
            ? 'Nenhum cliente corresponde ao filtro.'
            : 'Ainda não há clientes. Crie o primeiro.'}
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto_auto] items-center px-4 py-2 bg-muted/50 border-b border-border">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Cliente</span>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide w-32 text-center hidden sm:block">Usuários</span>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide w-24 text-center hidden md:block">Status</span>
          <span className="w-16" />
        </div>

        <AnimatePresence mode="popLayout">
          {paginated.map((c, i) => {
            const clientUsers = getClientUsers(c.id)
            const pendingUsers = getPendingUsers(c.id)
            const hasPending = pendingUsers.length > 0
            const isActive = clientUsers.length > 0 && !hasPending

            return (
              <motion.div
                key={c.id}
                layout={!reduced}
                initial={reduced ? { opacity: 0 } : { opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, x: 8 }}
                transition={{ duration: 0.18, ease: EASE_OUT_QUINT, delay: reduced ? 0 : i * 0.025 }}
                className="group grid grid-cols-[1fr_auto_auto_auto] items-center px-4 py-3 border-b border-border/60 last:border-b-0 hover:bg-muted/30 transition-colors"
              >
                <div className="min-w-0 pr-4">
                  <button
                    onClick={() => onEdit(c)}
                    className="text-sm font-medium truncate hover:underline underline-offset-2 cursor-pointer text-left"
                    title={c.name}
                  >
                    {c.name}
                  </button>
                  <div className="text-xs text-muted-foreground font-mono mt-0.5 truncate">/{c.slug}</div>
                </div>

                <div className="w-32 text-center hidden sm:flex justify-center items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-sm tabular-nums">{clientUsers.length}</span>
                  {hasPending && (
                    <span className="text-xs text-orange-600 dark:text-orange-400 tabular-nums">
                      ({pendingUsers.length} pend.)
                    </span>
                  )}
                </div>

                <div className="w-24 hidden md:flex justify-center">
                  <ClientStatusDot hasPending={hasPending} isActive={isActive} />
                </div>

                <div className="w-16 flex justify-end items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onEdit(c)}
                    className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                    aria-label={`Editar ${c.name}`}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDeleteRequest(c)}
                    disabled={deletingId === c.id}
                    className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer disabled:opacity-50"
                    aria-label={`Eliminar ${c.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
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
            {start + 1}–{Math.min(page * PAGE_SIZE, clients.length)} de {clients.length}
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
