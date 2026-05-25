import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { Link2, Mail } from 'lucide-react'
import { EASE_OUT_QUINT } from './types'
import type { PendingAuthUser } from '../../hooks/useAdminData'

interface PendingUsersListProps {
  reduced: boolean
  pendingUsers: PendingAuthUser[]
  onLinkClick: (user: PendingAuthUser) => void
}

export function PendingUsersList({ reduced, pendingUsers, onLinkClick }: PendingUsersListProps) {
  if (pendingUsers.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-muted-foreground">Nenhum usuário pendente</p>
        <p className="text-xs text-muted-foreground mt-1">
          Usuários que fizerem login com o domínio permitido mas ainda não foram vinculados aparecerão aqui.
        </p>
      </div>
    )
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="grid grid-cols-[1fr_auto_auto] items-center px-4 py-2 bg-muted/50 border-b border-border">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Usuário</span>
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide w-36 text-center hidden sm:block">Último login</span>
        <span className="w-24" />
      </div>
      <AnimatePresence mode="popLayout">
        {pendingUsers.map((pu, i) => (
          <motion.div
            key={pu.id}
            layout={!reduced}
            initial={reduced ? { opacity: 0 } : { opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, x: 8 }}
            transition={{ duration: 0.18, ease: EASE_OUT_QUINT, delay: reduced ? 0 : i * 0.025 }}
            className="group grid grid-cols-[1fr_auto_auto] items-center px-4 py-3 border-b border-border/60 last:border-b-0 hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-2.5 min-w-0 pr-4">
              <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium overflow-hidden shrink-0">
                {pu.avatarUrl
                  ? <img src={pu.avatarUrl} alt="" className="w-full h-full object-cover" />
                  : pu.email.charAt(0).toUpperCase()
                }
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{pu.name}</p>
                <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                  <Mail className="w-3 h-3 shrink-0" />{pu.email}
                </p>
              </div>
            </div>

            <div className="w-36 text-center hidden sm:block">
              {pu.lastSignInAt ? (
                <span className="text-xs text-muted-foreground tabular-nums">
                  {new Date(pu.lastSignInAt).toLocaleDateString('pt-BR')}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              )}
            </div>

            <div className="w-24 flex justify-end">
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => onLinkClick(pu)}>
                <Link2 className="w-3 h-3" />
                Vincular
              </Button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
