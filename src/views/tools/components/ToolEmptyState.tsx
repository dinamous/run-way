import { Inbox } from 'lucide-react'

export function ToolEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
      <Inbox className="w-10 h-10 text-muted-foreground" />
      <p className="text-base font-medium">Nenhuma ferramenta disponível</p>
      <p className="text-sm text-muted-foreground">Volte mais tarde para ver as ferramentas disponíveis.</p>
    </div>
  )
}
