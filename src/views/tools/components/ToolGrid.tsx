import type { Tool } from '../tools.mock'
import { ToolCard } from './ToolCard'

interface ToolGridProps {
  tools: Tool[]
  onSelectTool: (id: string) => void
}

export function ToolGrid({ tools, onSelectTool }: ToolGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {tools.map((tool) => (
        <ToolCard key={tool.id} tool={tool} onClick={() => onSelectTool(tool.id)} />
      ))}
    </div>
  )
}
