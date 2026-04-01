import { X } from 'lucide-react';
import { STEP_TYPES_ORDER, STEP_META, type StepType } from '@/lib/steps';
import type { Member } from '@/types/member';

interface FilterBarProps {
  members: Member[];
  filterAssignee: string;
  onChangeAssignee: (value: string) => void;
  filterStatus: string;
  onChangeStatus: (value: string) => void;
  filterSteps: StepType[];
  onToggleStep: (type: StepType) => void;
  hasActiveFilters: boolean;
  onClear: () => void;
  filteredCount: number;
  totalCount: number;
}

export function FilterBar({
  members,
  filterAssignee,
  onChangeAssignee,
  filterStatus,
  onChangeStatus,
  filterSteps,
  onToggleStep,
  hasActiveFilters,
  onClear,
  filteredCount,
  totalCount,
}: FilterBarProps) {
  return (
    <div className="px-3 py-2 rounded-xl border border-border bg-muted print:hidden">
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={filterAssignee}
          onChange={e => onChangeAssignee(e.target.value)}
          className="text-xs rounded-lg border border-border bg-card px-2 py-1.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Responsável</option>
          {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={e => onChangeStatus(e.target.value)}
          className="text-xs rounded-lg border border-border bg-card px-2 py-1.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Status</option>
          <option value="bloqueado">Bloqueado</option>
          <option value="nao-bloqueado">Não bloqueado</option>
        </select>
        <div className="w-px h-4 bg-border mx-0.5" />
        {STEP_TYPES_ORDER.map(type => {
          const meta = STEP_META[type];
          const active = filterSteps.includes(type);
          return (
            <button
              key={type}
              onClick={() => onToggleStep(type)}
              className={`px-2 py-1 rounded-full text-xs font-medium border transition-colors ${active ? meta.tagBg + ' border-transparent' : 'bg-card border-border text-muted-foreground hover:text-foreground'}`}
            >
              {meta.tag}
            </button>
          );
        })}
        {hasActiveFilters && (
          <>
            <span className="text-xs text-muted-foreground ml-auto">{filteredCount}/{totalCount}</span>
            <button onClick={onClear} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors">
              <X className="w-3 h-3" /> Limpar
            </button>
          </>
        )}
      </div>
    </div>
  );
}
