import type { Tool } from '../tools.mock'

interface ToolCardProps {
  tool: Tool
}

export function ToolCard({ tool }: ToolCardProps) {
  const { icon: Icon, title, description } = tool
  return (
    <div className="border rounded-xl p-6 hover:shadow-md transition-shadow cursor-pointer">
      <div className="flex items-center gap-3 mb-3">
        <Icon className="w-5 h-5 text-muted-foreground" />
        <span className="text-lg font-medium">{title}</span>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
