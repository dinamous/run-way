import { useState } from 'react';
import { Search, User, Calendar, AlertCircle, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { STEP_META, STEP_TYPES_ORDER, type StepType } from '@/lib/steps';
import type { Member } from '@/hooks/useSupabase';

const PERIOD_TABS = [
  { value: '', label: 'Todos' },
  { value: '7', label: '7d' },
  { value: '15', label: '15d' },
  { value: '30', label: '30d' },
] as const;

export interface FiltersState {
  searchTerm: string;
  selectedSteps: StepType[];
  selectedMemberIds: string[];
  selectedPeriod: string;
  showOnlyBlocked: boolean;
}

interface TasksFiltersProps {
  filters: FiltersState;
  members: Member[];
  onChange: (next: Partial<FiltersState>) => void;
  onClear: () => void;
}

function CheckboxDropdown({
  label,
  icon,
  options,
  selected,
  onToggle,
}: {
  label: string;
  icon?: React.ReactNode;
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
        className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-md border transition-colors whitespace-nowrap min-w-[11rem] justify-between ${
          selected.length > 0
            ? 'border-primary bg-primary/5 text-foreground'
            : 'border-input bg-background text-muted-foreground hover:bg-muted'
        }`}
      >
        <span className="flex items-center gap-1.5 min-w-0">
          {icon}
          <span className="truncate">{displayLabel}</span>
        </span>
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

export function TasksFilters({ filters, members, onChange, onClear }: TasksFiltersProps) {
  const { searchTerm, selectedSteps, selectedMemberIds, selectedPeriod, showOnlyBlocked } = filters;
  const hasActiveFilters = searchTerm !== '' || selectedSteps.length > 0 || selectedMemberIds.length > 0 || selectedPeriod !== '' || showOnlyBlocked;

  function toggleStep(step: StepType) {
    const next = selectedSteps.includes(step)
      ? selectedSteps.filter(s => s !== step)
      : [...selectedSteps, step];
    onChange({ selectedSteps: next });
  }

  function toggleMember(id: string) {
    const next = selectedMemberIds.includes(id)
      ? selectedMemberIds.filter(m => m !== id)
      : [...selectedMemberIds, id];
    onChange({ selectedMemberIds: next });
  }

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3 rounded-lg border border-border bg-muted/20">
      {/* Search — grows to fill available space */}
      <div className="relative min-w-0 flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          type="text"
          placeholder="Pesquisar demanda ou ID..."
          value={searchTerm}
          onChange={e => onChange({ searchTerm: e.target.value })}
          className="pl-9 w-full"
        />
      </div>

      {/* Controls — fixed, won't collapse or shift */}
      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
        {/* Etapa — checkbox dropdown */}
        <CheckboxDropdown
          label="Todas as etapas"
          options={STEP_TYPES_ORDER.map(s => ({ value: s, label: STEP_META[s].label }))}
          selected={selectedSteps}
          onToggle={v => toggleStep(v as StepType)}
        />

        {/* Responsável — checkbox dropdown */}
        <CheckboxDropdown
          label="Todos responsáveis"
          icon={<User className="w-4 h-4 shrink-0" />}
          options={members.map(m => ({ value: m.id, label: m.name }))}
          selected={selectedMemberIds}
          onToggle={toggleMember}
        />

        {/* Período (prazo) */}
        <div className="flex items-center gap-1 border border-input bg-background rounded-md px-2 py-1">
          <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
          {PERIOD_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => onChange({ selectedPeriod: tab.value })}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                selectedPeriod === tab.value
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Bloqueadas toggle */}
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

        {/* Limpar — reserva espaço fixo para evitar layout shift */}
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
