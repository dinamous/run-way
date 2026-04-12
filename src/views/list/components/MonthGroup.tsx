import type { Task } from '@/lib/steps';
import type { Member } from '@/hooks/useSupabase';
import type { NormalisedTask } from '../hooks/useListFilters';
import { DemandRow } from './DemandRow';

interface MonthGroupProps {
  monthKey: string;
  items: NormalisedTask[];
  isCurrentMonth: boolean;
  members: Member[];
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onConclude: (task: Task) => void;
  onToggleBlock: (task: Task) => void;
}

function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    .replace(/^\w/, c => c.toUpperCase());
}

export function MonthGroup({ monthKey, items, isCurrentMonth, members, onEdit, onDelete, onConclude, onToggleBlock }: MonthGroupProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 py-1.5 border-b border-border">
        <span className="text-sm font-semibold text-foreground">
          {formatMonthLabel(monthKey)}
        </span>
        {isCurrentMonth && (
          <span className="px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold leading-none">
            Atual
          </span>
        )}
        <span className="text-xs text-muted-foreground ml-auto">
          {items.length} {items.length === 1 ? 'demanda' : 'demandas'}
        </span>
      </div>

      {items.map(({ task, referenceDate }) => (
        <DemandRow
          key={task.id}
          task={task}
          referenceDate={referenceDate}
          members={members}
          onEdit={onEdit}
          onDelete={onDelete}
          onConclude={onConclude}
          onToggleBlock={onToggleBlock}
        />
      ))}
    </div>
  );
}
