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
    <div className={cn('flex flex-col h-full bg-[oklch(0.955_0.004_250)] dark:bg-[oklch(0.13_0.008_250)] relative', className)}>
      <div className="overview-ambient absolute inset-0 pointer-events-none" aria-hidden="true" />

      {showBreadcrumb && (
        <div className="view-ink-strip sticky top-0 z-40 isolate">
          <div className="max-w-screen-xl mx-auto w-full px-4 md:px-6 lg:px-8 h-14 flex items-center">
            <ViewBreadcrumb
              view={activeView}
              clientName={selectedClient?.name}
              subview={subview}
              onNavigate={onViewChange}
            />
          </div>
        </div>
      )}

      <div className={cn('relative z-10 flex-1 max-w-screen-xl mx-auto w-full', !noPadding && 'p-4 md:p-6 lg:p-8')}>
        {children}
      </div>
    </div>
  )
}
