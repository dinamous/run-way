import { Search, User, Calendar, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
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
  selectedStep: StepType | '';
  selectedMemberId: string;
  selectedPeriod: string;
  showOnlyBlocked: boolean;
}

interface TasksFiltersProps {
  filters: FiltersState;
  members: Member[];
  onChange: (next: Partial<FiltersState>) => void;
  onClear: () => void;
}

export function TasksFilters({ filters, members, onChange, onClear }: TasksFiltersProps) {
  const { searchTerm, selectedStep, selectedMemberId, selectedPeriod, showOnlyBlocked } = filters;
  const hasActiveFilters = searchTerm !== '' || selectedStep !== '' || selectedMemberId !== '' || selectedPeriod !== '' || showOnlyBlocked;

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
        {/* Etapa */}
        <Select
          value={selectedStep || '__all__'}
          onValueChange={v => onChange({ selectedStep: v === '__all__' ? '' : v as StepType })}
        >
          <SelectTrigger className="w-44 text-sm">
            <SelectValue placeholder="Todas as etapas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todas as etapas</SelectItem>
            {STEP_TYPES_ORDER.map(step => (
              <SelectItem key={step} value={step}>{STEP_META[step].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Responsável */}
        <Select
          value={selectedMemberId || '__all__'}
          onValueChange={v => onChange({ selectedMemberId: v === '__all__' ? '' : v })}
        >
          <SelectTrigger className="w-44 text-sm">
            <User className="w-4 h-4 text-muted-foreground" />
            <SelectValue placeholder="Todos responsáveis" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos responsáveis</SelectItem>
            {members.map(m => (
              <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

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
