import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { ViewBreadcrumb } from '@/components/ViewBreadcrumb'
import { useLayoutContext } from '@/contexts/LayoutContext'
import type { ViewType } from '@/store/useUIStore'

interface ViewShellProps {
  children: ReactNode
  /** Subview label para o último crumb (ex: "Analisador de Briefing") */
  subview?: string
  /** Override da view ativa — use quando o shell não consegue inferir (ex: view="home" com cliente) */
  viewOverride?: ViewType
  /** Desabilita o padding padrão (ex: views com scroll próprio ou layout especial) */
  noPadding?: boolean
  className?: string
}

// Views que não exibem breadcrumb (sem contexto de navegação útil)
const NO_BREADCRUMB = new Set<string>(['login', 'onboarding', 'client-picker'])

export function ViewShell({ children, subview, viewOverride, noPadding, className }: ViewShellProps) {
  const { view, router: { selectedClient, onViewChange } } = useLayoutContext()
  const activeView = viewOverride ?? view

  const showBreadcrumb = !NO_BREADCRUMB.has(activeView)

  return (
    <div className={cn('flex flex-col min-h-full bg-surface-tinted relative', className)}>
      <div className="overview-ambient absolute inset-0 pointer-events-none" aria-hidden="true" />

      {showBreadcrumb && (
        <div className="view-ink-strip bg-surface-tinted sticky top-0 z-40 isolate shadow-[0_1px_0_var(--border-strip)]">
          <div className="w-full md:pl-[90px] px-4 md:pr-6 lg:pr-8 h-14 flex items-center">
            <ViewBreadcrumb
              view={activeView}
              clientName={selectedClient?.name}
              subview={subview}
              onNavigate={onViewChange}
            />
          </div>
        </div>
      )}

      <div className={cn('relative z-10 flex-1 w-full', !noPadding && 'p-4 md:pl-[90px] md:pr-6 md:py-6 lg:pr-8 lg:py-8')}>
        {children}
      </div>
    </div>
  )
}
