import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Search, Plus, Clock, Building2 } from 'lucide-react'
import { FlipCount } from './FlipCount'
import type { StatusFilter } from './clientUtils'

interface ClientsToolbarProps {
  searchQuery: string
  onSearchChange: (val: string) => void
  statusFilter: StatusFilter
  onStatusChange: (f: StatusFilter) => void
  totalCount: number
  onNew: () => void
}

const FILTERS: { key: StatusFilter; label: string; icon?: React.ReactNode }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'with_pending', label: 'Com pendentes', icon: <Clock className="w-3 h-3" /> },
  { key: 'no_pending', label: 'Ativos', icon: <Building2 className="w-3 h-3" /> },
]

export function ClientsToolbar({
  searchQuery, onSearchChange, statusFilter, onStatusChange, totalCount, onNew,
}: ClientsToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 pb-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Buscar cliente ou slug..."
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          className="pl-8 h-8 w-56 text-sm"
        />
      </div>

      <div className="flex items-center gap-0.5 bg-muted rounded-md p-0.5">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => onStatusChange(f.key)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded transition-colors cursor-pointer ${
              statusFilter === f.key
                ? 'bg-background text-foreground font-medium shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {f.icon && (
              <span className={statusFilter === f.key ? 'opacity-100' : 'opacity-60'}>
                {f.icon}
              </span>
            )}
            {f.label}
          </button>
        ))}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <span className="text-xs text-muted-foreground tabular-nums">
          <FlipCount value={totalCount} /> cliente{totalCount !== 1 ? 's' : ''}
        </span>
        <Button size="sm" onClick={onNew} className="h-8 text-xs gap-1.5">
          <Plus className="w-3.5 h-3.5" />
          Novo cliente
        </Button>
      </div>
    </div>
  )
}
