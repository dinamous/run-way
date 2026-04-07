import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'

interface ViewStateProps {
  icon: LucideIcon
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}

export function ViewState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: ViewStateProps) {
  return (
    <Card className="max-w-2xl mx-auto">
      <CardContent className="py-14 px-8 flex flex-col items-center text-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
          <Icon className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-lg font-semibold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground max-w-md">{description}</p>
        {actionLabel && onAction && (
          <Button variant="outline" onClick={onAction} className="mt-2">
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
