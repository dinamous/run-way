import type { ViewState } from './tools.mock'
import { MOCK_TOOLS } from './tools.mock'
import { ToolGrid } from './components/ToolGrid'
import { ToolLoadingState } from './components/ToolLoadingState'
import { ToolEmptyState } from './components/ToolEmptyState'
import { ToolErrorState } from './components/ToolErrorState'

const viewState: ViewState = 'success'

export function ToolsView() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Ferramentas</h1>
      {viewState === 'loading' && <ToolLoadingState />}
      {viewState === 'error' && <ToolErrorState />}
      {viewState === 'empty' && <ToolEmptyState />}
      {viewState === 'success' && <ToolGrid tools={MOCK_TOOLS} />}
    </div>
  )
}
