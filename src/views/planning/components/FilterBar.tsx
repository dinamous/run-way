import { Button } from '@/components/ui';
import { X, Plus, Download } from 'lucide-react';
import { STEP_TYPES_ORDER, STEP_META, type StepType } from '@/lib/steps';
import type { Member } from '@/types/member';
import type { CalendarViewMode } from '../hooks/useTaskFilters';

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
  showViewMode?: boolean;
  viewMode: CalendarViewMode;
  onChangeViewMode: (mode: CalendarViewMode) => void;
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
  showViewMode = false,
  viewMode = 'step',
  onChangeViewMode,
  onExport,
  onOpenNew,
  hasActiveFilters,
  onClear,
  filteredCount,
  totalCount,
}: FilterBarProps) {
  const renderStepButton = (type: StepType, className?: string) => {
    const meta = STEP_META[type];
    const active = filterSteps.includes(type);

    return (
      <button
        key={type}
        onClick={() => onToggleStep(type)}
        className={`whitespace-nowrap px-2 py-1 rounded-full text-xs font-medium border transition-colors ${active ? meta.tagBg + ' border-transparent' : 'bg-card border-border text-muted-foreground hover:text-foreground'} ${className ?? ''}`}
      >
        {meta.tag}
      </button>
    );
  };

  return (
    <div className="px-3 py-2 rounded-xl border border-border bg-muted print:hidden">
      <div className="flex flex-col gap-2 xl:hidden">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterAssignee}
            onChange={e => onChangeAssignee(e.target.value)}
            className="w-full sm:w-40 text-xs rounded-lg border border-border bg-card px-2 py-1.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Responsável</option>
            {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <select
            value={filterStatus}
            onChange={e => onChangeStatus(e.target.value)}
            className="w-full sm:w-32 text-xs rounded-lg border border-border bg-card px-2 py-1.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Status</option>
            <option value="bloqueado">Bloqueado</option>
            <option value="nao-bloqueado">Não bloqueado</option>
          </select>

          <div className="flex flex-wrap md:flex-nowrap items-center gap-2">
            {STEP_TYPES_ORDER.map(type => renderStepButton(type))}
          </div>

          {showViewMode && (
            <div className="flex items-center gap-1">
              <span className="text-xs font-semibold text-muted-foreground">Visualizar por:</span>
              <div className="inline-flex rounded-lg border border-border bg-card p-0.5">
                <button
                  onClick={() => onChangeViewMode('step')}
                  className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${viewMode === 'step' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Etapa
                </button>
                <button
                  onClick={() => onChangeViewMode('demand')}
                  className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${viewMode === 'demand' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Demanda
                </button>
              </div>
            </div>
          )}

        {showPeriodFilter && (
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
        )}

        {hasActiveFilters && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{filteredCount}/{totalCount}</span>
              <button onClick={onClear} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors">
                <X className="w-3 h-3" /> Limpar
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" variant="outline" onClick={onExport} className="w-full justify-center">
            <Download className="w-4 h-4 mr-1.5" /> PDF
          </Button>
          <Button size="sm" onClick={onOpenNew} className="w-full justify-center">
            <Plus className="w-4 h-4 mr-1.5" /> Nova Demanda
          </Button>
        </div>
      </div>

      <div className="hidden xl:flex xl:flex-wrap xl:items-center xl:gap-2">
        <select
          value={filterAssignee}
          onChange={e => onChangeAssignee(e.target.value)}
          className="w-36 lg:w-40 text-xs rounded-lg border border-border bg-card px-2 py-1.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Responsável</option>
          {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>

        <select
          value={filterStatus}
          onChange={e => onChangeStatus(e.target.value)}
          className="w-32 lg:w-36 text-xs rounded-lg border border-border bg-card px-2 py-1.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Status</option>
          <option value="bloqueado">Bloqueado</option>
          <option value="nao-bloqueado">Não bloqueado</option>
        </select>

        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          {STEP_TYPES_ORDER.map(type => renderStepButton(type))}
        </div>

        {showViewMode && (
          <div className="flex items-center gap-1">
            <span className="text-xs font-semibold text-muted-foreground">Visualizar por:</span>
            <div className="inline-flex rounded-lg border border-border bg-card p-0.5">
              <button
                onClick={() => onChangeViewMode('step')}
                className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${viewMode === 'step' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Etapa
              </button>
              <button
                onClick={() => onChangeViewMode('demand')}
                className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${viewMode === 'demand' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Demanda
              </button>
            </div>
          </div>
        )}

        {showPeriodFilter && (
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
        )}

        {hasActiveFilters && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{filteredCount}/{totalCount}</span>
            <button onClick={onClear} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors">
              <X className="w-3 h-3" /> Limpar
            </button>
          </div>
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
