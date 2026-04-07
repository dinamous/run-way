import { Button } from '@/components/ui';
import { X, Plus, Download } from 'lucide-react';
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
  showPeriodFilter?: boolean;
  filterPeriodDays: number;
  onChangePeriodDays: (value: number) => void;
  onExport: () => void;
  onOpenNew: () => void;
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
  showPeriodFilter = false,
  filterPeriodDays,
  onChangePeriodDays,
  onExport,
  onOpenNew,
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

        {showPeriodFilter && (
          <>
            <div className="w-px h-4 bg-border mx-0.5" />
            <div className="flex items-center gap-1">
              <span className="text-xs font-semibold text-muted-foreground">Período:</span>
              <div className="inline-flex rounded-lg border border-border bg-card p-0.5">
                {[15, 30, 60, 90].map(days => (
                  <button
                    key={days}
                    onClick={() => onChangePeriodDays(days)}
                    className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${filterPeriodDays === days ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    {days}
                  </button>
                ))}
              </div>
            </div>
            <div className="w-px h-4 bg-border mx-0.5" />
          </>
        )}
        {hasActiveFilters && (
          <>
            <span className="text-xs text-muted-foreground">{filteredCount}/{totalCount}</span>
            <button onClick={onClear} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors">
              <X className="w-3 h-3" /> Limpar
            </button>
          </>
        )}
        <div className="ml-auto flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={onExport}>
          <Download className="w-4 h-4 mr-1.5" /> PDF
        </Button>
        <Button size="sm" onClick={onOpenNew}>
          <Plus className="w-4 h-4 mr-1.5" /> Nova Demanda
        </Button>
        </div>
      </div>
    </div>
  );
}
