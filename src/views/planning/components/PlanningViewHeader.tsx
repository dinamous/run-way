import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';
import { Plus } from 'lucide-react';
import { TasksFilters, type FiltersState } from './TasksFilters';
import type { Member } from '@/types/member';

const DEMAND_TABS = [
  { value: 'demandas', label: 'Todas as Demandas' },
  { value: 'calendar', label: 'Calendário' },
  { value: 'timeline', label: 'Linha do Tempo' },
] as const;

const VIEW_TITLES: Record<string, { title: string; description: string }> = {
  calendar: { title: 'Calendário', description: 'Visualize as demandas em calendário mensal.' },
  timeline: { title: 'Linha do Tempo', description: 'Acompanhe as fases das demandas em Gantt.' },
  list: { title: 'Lista', description: 'Todas as demandas em formato de tabela.' },
  demandas: { title: 'Demandas', description: 'Visualize todas as demandas por etapa atual.' },
};

interface PlanningViewHeaderProps {
  subview: string;
  onViewChange: (value: string) => void;
  onOpenNew: () => void;
  members: Member[];
  // TasksFilters props (demandas)
  demandasFilters: FiltersState;
  onChangeDemandasFilters: (next: Partial<FiltersState>) => void;
  onClearDemandasFilters: () => void;
  // TasksFilters props (calendar / timeline)
  calendarFilters: FiltersState;
  onChangeCalendarFilters: (next: Partial<FiltersState>) => void;
  onClearCalendarFilters: () => void;
}

export function PlanningViewHeader({
  subview,
  onViewChange,
  onOpenNew,
  members,
  demandasFilters,
  onChangeDemandasFilters,
  onClearDemandasFilters,
  calendarFilters,
  onChangeCalendarFilters,
  onClearCalendarFilters,
}: PlanningViewHeaderProps) {
  const { title, description } = VIEW_TITLES[subview] ?? VIEW_TITLES.calendar;
  const showDemandasFilters = subview === 'demandas';
  const showCalendarFilters = subview === 'calendar' || subview === 'timeline';

  return (
    <div className="space-y-5">
      <Tabs value={subview} onValueChange={onViewChange}>
        <TabsList variant="underline" className="w-full justify-end gap-0">
          {DEMAND_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} variant="underline">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>
        {showDemandasFilters && (
          <Button onClick={onOpenNew} className="shrink-0">
            <Plus className="w-4 h-4" />
            Nova Demanda
          </Button>
        )}
      </div>

      {showDemandasFilters && (
        <TasksFilters
          filters={demandasFilters}
          members={members}
          onChange={onChangeDemandasFilters}
          onClear={onClearDemandasFilters}
        />
      )}

      {showCalendarFilters && (
        <TasksFilters
          filters={calendarFilters}
          members={members}
          onChange={onChangeCalendarFilters}
          onClear={onClearCalendarFilters}
        />
      )}
    </div>
  );
}
