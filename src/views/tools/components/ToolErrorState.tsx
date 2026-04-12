import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui'

export function ToolErrorState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
      <AlertTriangle className="w-10 h-10 text-destructive" />
      <p className="text-base font-medium">Erro ao carregar ferramentas</p>
      <Button variant="outline">Tentar novamente</Button>
    </div>
  )
}
