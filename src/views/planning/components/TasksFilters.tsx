import { useState } from 'react';
import { Search, Calendar, AlertCircle, ChevronDown, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ViewTabs, type ViewTab } from '@/components/ui/ViewTabs';
import { STEP_META, STEP_TYPES_ORDER, SUBTASK_PROGRESS_META, SUBTASK_PROGRESS_STATUS_ORDER, type StepType, type SubtaskProgressStatus } from '@/lib/steps';
import type { Member } from '@/hooks/infra/useSupabase';

const PERIOD_TABS: readonly ViewTab<string>[] = [
  { value: '', label: 'Todos' },
  { value: '7', label: '7d' },
  { value: '15', label: '15d' },
  { value: '30', label: '30d' },
];

export interface FiltersState {
  searchTerm: string;
  selectedSteps: StepType[];
  selectedProgressStatuses: SubtaskProgressStatus[];
  selectedMemberIds: string[];
  selectedPeriod: string;
  showOnlyBlocked: boolean;
  showConcluded: boolean;
}

interface TasksFiltersProps {
  filters: FiltersState;
  members: Member[];
  onChange: (next: Partial<FiltersState>) => void;
  onClear: () => void;
}

function CheckboxDropdown({
  label,
  width = 'w-44',
  options,
  selected,
  onToggle,
}: {
  label: string;
  width?: string;
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const displayLabel =
    selected.length === 0
      ? label
      : selected.length === 1
        ? options.find(o => o.value === selected[0])?.label ?? label
        : `${selected.length} selecionados`;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-md border transition-colors whitespace-nowrap ${width} justify-between ${
          selected.length > 0
            ? 'border-primary bg-primary/5 text-foreground'
            : 'border-input bg-background text-muted-foreground hover:bg-muted'
        }`}
      >
        <span className="truncate">{displayLabel}</span>
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-20 w-52 bg-popover border border-border rounded-md shadow-md py-1">
            {options.map(opt => (
              <label
                key={opt.value}
                className="flex items-center gap-2.5 px-3 py-2 text-sm cursor-pointer hover:bg-muted select-none"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(opt.value)}
                  onChange={() => onToggle(opt.value)}
                  className="w-3.5 h-3.5 accent-primary shrink-0"
                />
                <span className="truncate">{opt.label}</span>
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function MemberAvatarPicker({
  members,
  selectedIds,
  onToggle,
}: {
  members: Member[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-md border transition-colors whitespace-nowrap w-36 justify-between ${
          selectedIds.length > 0
            ? 'border-primary bg-primary/5 text-foreground'
            : 'border-input bg-background text-muted-foreground hover:bg-muted'
        }`}
        title="Filtrar por responsável"
      >
        {selectedIds.length === 0 ? (
          <span className="text-sm">Responsável</span>
        ) : (
          <span className="flex items-center gap-1">
            {selectedIds.slice(0, 3).map(id => {
              const m = members.find(m => m.id === id);
              return m ? (
                <span
                  key={id}
                  className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold flex items-center justify-center shrink-0 ring-1 ring-background -ml-1 first:ml-0"
                  title={m.name}
                >
                  {m.avatar}
                </span>
              ) : null;
            })}
            {selectedIds.length > 3 && (
              <span className="text-xs text-muted-foreground ml-1">+{selectedIds.length - 3}</span>
            )}
          </span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ml-1 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-20 w-56 bg-popover border border-border rounded-md shadow-md py-1">
            {members.map(m => {
              const selected = selectedIds.includes(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onToggle(m.id)}
                  className={`flex items-center gap-2.5 px-3 py-2 w-full text-left text-sm hover:bg-muted transition-colors ${selected ? 'bg-primary/5' : ''}`}
                >
                  {m.avatar_url ? (
                    <img src={m.avatar_url} alt={m.name} className="w-7 h-7 rounded-full object-cover shrink-0" />
                  ) : (
                    <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center shrink-0">
                      {m.avatar}
                    </span>
                  )}
                  <span className="flex-1 truncate">{m.name}</span>
                  {selected && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export function TasksFilters({ filters, members, onChange, onClear }: TasksFiltersProps) {
  const { searchTerm, selectedSteps, selectedProgressStatuses, selectedMemberIds, selectedPeriod, showOnlyBlocked, showConcluded } = filters;
  const hasActiveFilters =
    searchTerm !== '' ||
    selectedSteps.length > 0 ||
    selectedProgressStatuses.length > 0 ||
    selectedMemberIds.length > 0 ||
    selectedPeriod !== '' ||
    showOnlyBlocked ||
    showConcluded;

  function toggleStep(step: StepType) {
    const next = selectedSteps.includes(step)
      ? selectedSteps.filter(s => s !== step)
      : [...selectedSteps, step];
    onChange({ selectedSteps: next });
  }

  function toggleProgressStatus(status: SubtaskProgressStatus) {
    const next = selectedProgressStatuses.includes(status)
      ? selectedProgressStatuses.filter(s => s !== status)
      : [...selectedProgressStatuses, status];
    onChange({ selectedProgressStatuses: next });
  }

  function toggleMember(id: string) {
    const next = selectedMemberIds.includes(id)
      ? selectedMemberIds.filter(m => m !== id)
      : [...selectedMemberIds, id];
    onChange({ selectedMemberIds: next });
  }

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3 rounded-lg border border-border bg-muted/20">
      <div className="relative min-w-0 flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          type="text"
          placeholder="Pesquisar demanda, subtask ou ID..."
          value={searchTerm}
          onChange={e => onChange({ searchTerm: e.target.value })}
          className="pl-9 w-full"
        />
      </div>

      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
        <CheckboxDropdown
          label="Categoria"
          options={STEP_TYPES_ORDER.map(s => ({ value: s, label: STEP_META[s].label }))}
          selected={selectedSteps}
          onToggle={v => toggleStep(v as StepType)}
        />

        <CheckboxDropdown
          label="Status"
          options={SUBTASK_PROGRESS_STATUS_ORDER.map(s => ({ value: s, label: SUBTASK_PROGRESS_META[s].label }))}
          selected={selectedProgressStatuses}
          onToggle={v => toggleProgressStatus(v as SubtaskProgressStatus)}
        />

        <MemberAvatarPicker
          members={members}
          selectedIds={selectedMemberIds}
          onToggle={toggleMember}
        />

        <div className="flex items-center gap-1 border border-input bg-background rounded-md px-2 py-1">
          <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
          <ViewTabs
            tabs={PERIOD_TABS}
            value={selectedPeriod}
            onChange={v => onChange({ selectedPeriod: v })}
          />
        </div>

        <button
          onClick={() => onChange({ showOnlyBlocked: !showOnlyBlocked })}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md border transition-colors whitespace-nowrap ${
            showOnlyBlocked
              ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-800'
              : 'bg-background text-muted-foreground border-input hover:bg-muted'
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5" />
          Bloqueadas
        </button>

        <button
          onClick={() => onChange({ showConcluded: !showConcluded })}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md border transition-colors whitespace-nowrap ${
            showConcluded
              ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800'
              : 'bg-background text-muted-foreground border-input hover:bg-muted'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Concluídas
        </button>

        <div className="w-[68px]">
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={onClear} className="w-full">
              Limpar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
