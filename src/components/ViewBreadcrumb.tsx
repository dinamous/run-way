import { cn } from '@/lib/utils'
import type { ViewType } from '@/store/useUIStore'

interface BreadcrumbItem {
  label: string
  onClick?: () => void
}

interface ViewBreadcrumbProps {
  view: ViewType
  clientName?: string | null
  subview?: string | null
  className?: string
  onNavigate?: (view: ViewType) => void
}

const VIEW_LABELS: Partial<Record<ViewType, string>> = {
  home: 'Início',
  'client-overview': 'Visão Geral',
  calendar: 'Calendário',
  timeline: 'Timeline',
  list: 'Lista',
  demandas: 'Demandas',
  kanban: 'Kanban',
  members: 'Membros',
  reports: 'Relatórios',
  'reports-fluxo': 'Fluxo',
  'reports-timeline': 'Timeline',
  'reports-membros': 'Membros',
  'reports-alertas': 'Alertas',
  admin: 'Admin',
  clients: 'Informaçoes do Cliente',
  tools: 'Ferramentas',
  'tools-briefing-analyzer': 'Analisador de Briefing',
  'tools-import': 'Importar',
  'tools-export': 'Exportar',
  'tools-integrations': 'Integrações',
  profile: 'Perfil',
}

const PARENT_VIEW: Partial<Record<ViewType, ViewType>> = {
  'reports-fluxo': 'reports',
  'reports-timeline': 'reports',
  'reports-membros': 'reports',
  'reports-alertas': 'reports',
  'tools-briefing-analyzer': 'tools',
  'tools-import': 'tools',
  'tools-export': 'tools',
  'tools-integrations': 'tools',
  calendar: 'demandas',
  timeline: 'demandas',
  list: 'home',
  demandas: 'client-overview',
  kanban: 'demandas',
}

function buildCrumbs(
  view: ViewType,
  subview: string | null | undefined,
  onNavigate?: (view: ViewType) => void
): BreadcrumbItem[] {
  const crumbs: BreadcrumbItem[] = []

  const ancestors: ViewType[] = []
  let current: ViewType | undefined = PARENT_VIEW[view]
  while (current) {
    ancestors.unshift(current)
    current = PARENT_VIEW[current]
  }

  for (const ancestor of ancestors) {
    crumbs.push({
      label: VIEW_LABELS[ancestor] ?? ancestor,
      onClick: onNavigate ? () => onNavigate(ancestor) : undefined,
    })
  }

  const viewLabel = VIEW_LABELS[view] ?? view
  const isLeaf = !subview
  crumbs.push({
    label: viewLabel,
    onClick: !isLeaf && onNavigate ? () => onNavigate(view) : undefined,
  })

  if (subview) {
    crumbs.push({ label: subview })
  }

  return crumbs
}

export function ViewBreadcrumb({ view, clientName, subview, className, onNavigate }: ViewBreadcrumbProps) {
  const crumbs = buildCrumbs(view, subview, onNavigate)

  if (crumbs.length === 0) return null

  return (
    <nav aria-label="breadcrumb" className={cn('flex items-center gap-0', className)}>
      {clientName && (
        <span className="text-[0.6875rem] font-semibold tracking-[0.04em] uppercase text-[oklch(0.42_0.008_250)] dark:text-[oklch(0.75_0.008_250)] bg-[oklch(0.88_0.008_250/0.6)] dark:bg-[oklch(0.22_0.010_250/0.7)] border border-[oklch(0.82_0.008_250)] dark:border-[oklch(0.30_0.008_250)] rounded px-2 py-0.5 mr-2.5" aria-label={`Cliente: ${clientName}`}>
          {clientName}
        </span>
      )}

      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1
        return (
          <span key={i} className="flex items-center">
            {i > 0 && (
              <span className="text-[0.8125rem] font-light text-[oklch(0.52_0.006_250/0.5)] dark:text-[oklch(0.55_0.006_250/0.45)] px-1.5 select-none leading-none" aria-hidden="true">/</span>
            )}
            {crumb.onClick ? (
              <button
                type="button"
                onClick={crumb.onClick}
                className="view-breadcrumb-ancestor relative text-xs font-medium tracking-[0.005em] bg-none border-0 p-0 cursor-pointer no-underline transition-colors duration-[120ms] ease-out"
              >
                {crumb.label}
              </button>
            ) : (
              <span className={isLast ? 'view-breadcrumb-current font-semibold text-[0.8125rem] tracking-[-0.005em]' : 'view-breadcrumb-ancestor relative text-xs font-medium tracking-[0.005em] no-underline'}>
                {crumb.label}
              </span>
            )}
          </span>
        )
      })}
    </nav>
  )
}
