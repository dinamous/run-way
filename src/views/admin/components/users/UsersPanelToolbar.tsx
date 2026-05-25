import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Plus, Search, Clock, Key, UserX } from 'lucide-react'
import type { StatusFilter, CurrentTab } from './types'

interface UsersPanelToolbarProps {
  searchQuery: string
  onSearchChange: (v: string) => void
  currentTab: CurrentTab
  onTabChange: (tab: CurrentTab) => void
  statusFilter: StatusFilter
  onStatusFilterChange: (f: StatusFilter) => void
  pendingCount: number
  filteredCount: number
  onCreateClick: () => void
}

const MEMBER_FILTERS: { key: StatusFilter; label: string; icon?: React.ReactNode }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'active', label: 'Ativos', icon: <Key className="w-3 h-3" /> },
  { key: 'pending', label: 'Sem acesso', icon: <Clock className="w-3 h-3" /> },
  { key: 'deactivated', label: 'Desativados', icon: <UserX className="w-3 h-3" /> },
]

export function UsersPanelToolbar({
  searchQuery, onSearchChange, currentTab, onTabChange,
  statusFilter, onStatusFilterChange, pendingCount, filteredCount, onCreateClick,
}: UsersPanelToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 pb-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Buscar por nome, cargo ou email..."
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          className="pl-8 h-8 w-64 text-sm"
        />
      </div>

      <div className="flex items-center gap-0.5 bg-muted rounded-md p-0.5">
        <button
          onClick={() => onTabChange('members')}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded transition-colors cursor-pointer ${
            currentTab === 'members'
              ? 'bg-background text-foreground font-medium shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Membros
        </button>
        <button
          onClick={() => onTabChange('pending')}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded transition-colors cursor-pointer ${
            currentTab === 'pending'
              ? 'bg-background text-foreground font-medium shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Clock className={`w-3 h-3 ${currentTab === 'pending' ? 'text-orange-500' : 'text-orange-400 opacity-70'}`} />
          Pendentes ({pendingCount})
        </button>
      </div>

      {currentTab === 'members' && (
        <div className="flex items-center gap-0.5 bg-muted rounded-md p-0.5">
          {MEMBER_FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => onStatusFilterChange(f.key)}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded transition-colors cursor-pointer ${
                statusFilter === f.key
                  ? 'bg-background text-foreground font-medium shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {f.icon && <span className={statusFilter === f.key ? 'opacity-100' : 'opacity-60'}>{f.icon}</span>}
              {f.label}
            </button>
          ))}
        </div>
      )}

      <div className="ml-auto flex items-center gap-2">
        {currentTab === 'members' && (
          <>
            <span className="text-xs text-muted-foreground tabular-nums">
              {filteredCount} membro{filteredCount !== 1 ? 's' : ''}
            </span>
            <Button size="sm" onClick={onCreateClick} className="h-8 text-xs gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              Novo usuário
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
