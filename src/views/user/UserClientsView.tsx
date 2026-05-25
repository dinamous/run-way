import { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Building2, Hash, Users, Calendar, CheckCircle2,
  Clock, AlertCircle, ChevronRight, LayoutDashboard,
  Mail, Key, Globe, FileText,
} from 'lucide-react'
import type { ClientOption } from '@/contexts/AuthContext'
import { useTasksQuery } from '@/hooks/tasks/useTasksQuery'
import { useMembersQuery } from '@/hooks/members/useMembersQuery'
import { STEP_META } from '@/lib/steps'
import type { ViewType } from '@/store/useUIStore'

interface UserClientsViewProps {
  client: ClientOption | null
  isAdmin: boolean
  onViewChange: (view: ViewType) => void
}

function ClientInitials({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/)
  const initials = parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase()

  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-foreground text-background text-lg font-bold tracking-tight select-none">
      {initials}
    </div>
  )
}

interface StatCardProps {
  label: string
  value: number
  icon: React.ElementType
  warn?: boolean
  index: number
}

function StatCard({ label, value, icon: Icon, warn, index }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1], delay: 0.06 + index * 0.05 }}
      className="rounded-xl border border-border/60 bg-background/60 px-5 py-4 flex flex-col gap-2"
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50 leading-none">{label}</span>
        <Icon className={`h-3.5 w-3.5 ${warn ? 'text-destructive/70' : 'text-muted-foreground/25'}`} />
      </div>
      <span className={`text-3xl font-bold leading-none tabular-nums ${warn && value > 0 ? 'text-destructive' : 'text-foreground'}`}>
        {value}
      </span>
    </motion.div>
  )
}

interface NavCardProps {
  icon: React.ElementType
  label: string
  description: string
  onClick: () => void
  index: number
  badge?: string | number
}

function NavCard({ icon: Icon, label, description, onClick, index, badge }: NavCardProps) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1], delay: 0.18 + index * 0.05 }}
      onClick={onClick}
      className="group w-full text-left rounded-xl border border-border/50 bg-background/60 p-5 flex flex-col gap-3 hover:border-border hover:bg-accent/40 transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-foreground/[0.05] group-hover:bg-foreground/10 transition-colors">
          <Icon className="h-4 w-4 text-muted-foreground group-hover:text-foreground/60 transition-colors" />
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground/25 group-hover:text-muted-foreground/50 shrink-0 transition-colors mt-0.5" />
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground/80 group-hover:text-foreground transition-colors">{label}</span>
          {badge !== undefined && (
            <span className="rounded-full bg-foreground/10 px-1.5 py-0.5 text-[10px] font-semibold text-foreground/60">
              {badge}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground/50 leading-relaxed">{description}</p>
      </div>
    </motion.button>
  )
}

interface ComingSoonCardProps {
  icon: React.ElementType
  title: string
  description: string
  index: number
}

function ComingSoonCard({ icon: Icon, title, description, index }: ComingSoonCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1], delay: 0.36 + index * 0.04 }}
      className="rounded-xl border border-border/30 bg-background/30 p-4 flex flex-col gap-2.5"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-foreground/[0.03]">
            <Icon className="h-3.5 w-3.5 text-muted-foreground/30" />
          </div>
          <span className="text-sm font-semibold text-foreground/40">{title}</span>
        </div>
        <span className="shrink-0 rounded-full border border-border/40 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground/35">
          Em breve
        </span>
      </div>
      <p className="text-xs text-muted-foreground/35 leading-relaxed">{description}</p>
    </motion.div>
  )
}

const TODAY = new Date().toISOString().slice(0, 10)
const IN_7_DAYS = new Date(Date.now() + 7 * 86400_000).toISOString().slice(0, 10)

export function UserClientsView({ client, isAdmin, onViewChange }: UserClientsViewProps) {
  const { data: tasks = [] } = useTasksQuery(client?.id, isAdmin)
  const { data: members = [] } = useMembersQuery(client?.id)

  const stats = useMemo(() => {
    const activeTasks = tasks.filter(t => !t.concludedAt && !t.status.blocked)
    const blockedTasks = tasks.filter(t => t.status.blocked)

    const allSubtasks = tasks.flatMap(t => t.subtasks)
    const activeSubtasks = allSubtasks.filter(s => s.active)

    const upcoming = activeSubtasks
      .filter(s => s.end && s.end >= TODAY && s.end <= IN_7_DAYS && s.progressStatus !== 'done' && s.progressStatus !== 'canceled')
      .sort((a, b) => a.end.localeCompare(b.end))
      .slice(0, 4)

    const overdue = activeSubtasks.filter(
      s => s.end && s.end < TODAY && s.progressStatus !== 'done' && s.progressStatus !== 'canceled'
    )

    return { activeTasks, blockedTasks, activeSubtasks, upcoming, overdue }
  }, [tasks])

  const activeMembers = members.filter(m => m.is_active !== false)

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
        <Building2 className="w-10 h-10 opacity-30" />
        <p className="text-base font-medium">Nenhum cliente selecionado</p>
        <p className="text-sm text-muted-foreground/60">Selecione um cliente no menu superior.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8 w-full">

      {/* Identity */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="flex items-center gap-4"
      >
        <ClientInitials name={client.name} />
        <div className="flex flex-col gap-0.5">
          <h1 className="text-2xl font-bold text-foreground leading-tight">{client.name}</h1>
          {client.slug && (
            <div className="flex items-center gap-1.5 text-muted-foreground/50">
              <Hash className="h-3 w-3" />
              <span className="text-xs font-mono">{client.slug}</span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Stats row: 4 columns full-width */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Demandas ativas" value={stats.activeTasks.length} icon={CheckCircle2} index={0} />
        <StatCard label="Fases em andamento" value={stats.activeSubtasks.length} icon={Clock} index={1} />
        <StatCard label="Atrasadas" value={stats.overdue.length} icon={AlertCircle} warn={stats.overdue.length > 0} index={2} />
        <StatCard label="Membros ativos" value={activeMembers.length} icon={Users} index={3} />
      </div>

      {/* Main bento: entregas + navegação side-by-side */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

        {/* Próximas entregas */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1], delay: 0.12 }}
          className="flex flex-col gap-3"
        >
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/50">Próximas entregas</span>
            <div className="h-px flex-1 bg-border/40" />
            <span className="text-[10px] font-semibold text-muted-foreground/35 uppercase tracking-wide">7 dias</span>
          </div>

          {stats.upcoming.length > 0 ? (
            <div className="flex flex-col divide-y divide-border/30 rounded-xl border border-border/50 overflow-hidden">
              {stats.upcoming.map((subtask, i) => {
                const meta = STEP_META[subtask.status]
                const isToday = subtask.end === TODAY
                return (
                  <motion.div
                    key={subtask.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.14 + i * 0.04 }}
                    className="flex items-center gap-3 px-4 py-3 bg-background/50"
                  >
                    <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${meta.tagBg}`}>
                      {meta.tag}
                    </span>
                    <span className="flex-1 text-sm text-foreground/80 truncate">{subtask.title}</span>
                    <span className={`shrink-0 text-xs font-semibold tabular-nums ${isToday ? 'text-destructive' : 'text-muted-foreground/50'}`}>
                      {isToday ? 'Hoje' : subtask.end}
                    </span>
                  </motion.div>
                )
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center rounded-xl border border-border/30 bg-background/30 py-10 text-muted-foreground/35">
              <p className="text-xs font-medium">Nenhuma entrega nos próximos 7 dias</p>
            </div>
          )}
        </motion.div>

        {/* Navegar */}
        <div className="flex flex-col gap-3">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2, delay: 0.14 }}
            className="flex items-center gap-3"
          >
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/50">Navegar</span>
            <div className="h-px flex-1 bg-border/40" />
          </motion.div>

          <div className="grid grid-cols-1 gap-2">
            <NavCard
              icon={LayoutDashboard}
              label="Visão Geral"
              description="Resumo de KPIs, inbox de notificações e plano do dia."
              onClick={() => onViewChange('home')}
              index={0}
            />
            <NavCard
              icon={Calendar}
              label="Planejamento"
              description="Calendário, timeline e kanban de demandas e fases de entrega."
              onClick={() => onViewChange('calendar')}
              index={1}
              badge={stats.activeTasks.length || undefined}
            />
            <NavCard
              icon={Users}
              label="Membros"
              description="Capacidade e alocação dos membros designados para este cliente."
              onClick={() => onViewChange('members')}
              index={2}
              badge={activeMembers.length || undefined}
            />
          </div>
        </div>
      </div>

      {/* Em desenvolvimento: 5 colunas */}
      <div className="flex flex-col gap-3">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2, delay: 0.32 }}
          className="flex items-center gap-3"
        >
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/35">Em desenvolvimento</span>
          <div className="h-px flex-1 bg-border/25" />
        </motion.div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {([
            { icon: Users, title: 'Gerente', description: 'Responsável de conta e ponto de contato interno.' },
            { icon: Mail, title: 'Contatos', description: 'Emails, telefones e pessoas do lado do cliente.' },
            { icon: Key, title: 'Acessos', description: 'Credenciais e acessos a plataformas do cliente.' },
            { icon: Globe, title: 'Contas', description: 'Serviços externos e plataformas de mídia ativas.' },
            { icon: FileText, title: 'Documentação', description: 'Briefings, contratos e referências de projeto.' },
          ] as const).map((mod, i) => (
            <ComingSoonCard key={mod.title} icon={mod.icon} title={mod.title} description={mod.description} index={i} />
          ))}
        </div>
      </div>

    </div>
  )
}
