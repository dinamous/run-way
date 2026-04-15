import type { ViewState } from './tools.mock'
import { MOCK_TOOLS } from './tools.mock'
import { ToolGrid } from './components/ToolGrid'
import { ToolLoadingState } from './components/ToolLoadingState'
import { ToolEmptyState } from './components/ToolEmptyState'
import { ToolErrorState } from './components/ToolErrorState'
import { BriefingAnalyzerView } from './components/BriefingAnalyzerView'
import type { ViewType } from '@/store/useUIStore'
import { useUIStore } from '@/store/useUIStore'

type ToolsSubview = Extract<ViewType, 'tools-briefing-analyzer' | 'tools-import' | 'tools-export' | 'tools-integrations'>

interface ToolsViewProps {
  subview?: ToolsSubview
}

const viewState: ViewState = 'success'

const TOOL_ID_MAP: Record<ToolsSubview, string> = {
  'tools-briefing-analyzer': 'briefing-analyzer',
  'tools-import': 'import',
  'tools-export': 'export',
  'tools-integrations': 'integrations',
}

export function ToolsView({ subview }: ToolsViewProps) {
  const setView = useUIStore((s) => s.setView)

  if (subview === 'tools-briefing-analyzer') {
    return <BriefingAnalyzerView onBack={() => setView('tools')} />
  }

  if (subview) {
    const toolId = TOOL_ID_MAP[subview]
    return (
      <div className="space-y-6">
        <p className="text-muted-foreground text-sm">Ferramenta: {toolId} (em breve)</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Ferramentas</h1>
      {viewState === 'loading' && <ToolLoadingState />}
      {viewState === 'error' && <ToolErrorState />}
      {viewState === 'empty' && <ToolEmptyState />}
      {viewState === 'success' && (
        <ToolGrid
          tools={MOCK_TOOLS}
          onSelectTool={(id) => {
            if (id === 'briefing-analyzer') setView('tools-briefing-analyzer')
          }}
        />
      )}
    </div>
  )
}
