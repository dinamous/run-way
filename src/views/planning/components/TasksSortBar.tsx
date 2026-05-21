import { useState } from 'react';
import { ArrowUpDown, Layers, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence, type Transition } from 'framer-motion';

export type SortField = 'title' | 'deadline' | 'created' | 'priority';
export type SortDirection = 'asc' | 'desc';
export type GroupBy = 'none' | 'step' | 'member' | 'status';

export interface SortState {
  sortField: SortField;
  sortDirection: SortDirection;
  groupBy: GroupBy;
}

export const EMPTY_SORT_STATE: SortState = {
  sortField: 'priority',
  sortDirection: 'asc',
  groupBy: 'none',
};

interface TasksSortBarProps {
  value: SortState;
  onChange: (next: Partial<SortState>) => void;
}

const EASE_OUT: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94];

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: 'priority', label: 'Prioridade' },
  { value: 'deadline', label: 'Prazo' },
  { value: 'title', label: 'Nome' },
  { value: 'created', label: 'Criação' },
];

const GROUP_OPTIONS: { value: GroupBy; label: string }[] = [
  { value: 'none', label: 'Sem agrupamento' },
  { value: 'step', label: 'Por fase' },
  { value: 'status', label: 'Por status' },
  { value: 'member', label: 'Por responsável' },
];

function SelectPill<T extends string>({
  icon,
  label,
  value,
  options,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find(o => o.value === value);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-md border border-input bg-background text-muted-foreground hover:bg-muted hover:text-foreground hover:border-border transition-all duration-150 whitespace-nowrap select-none"
      >
        <span className="opacity-50 shrink-0">{icon}</span>
        <span className="text-muted-foreground/60">{label}:</span>
        <span className="text-foreground font-semibold">{current?.label}</span>
        <ChevronDown className={`w-3 h-3 opacity-50 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.14, ease: EASE_OUT } as Transition }}
              exit={{ opacity: 0, y: -4, transition: { duration: 0.1 } as Transition }}
              className="absolute left-0 top-full mt-1.5 z-20 min-w-[172px] bg-popover border border-border rounded-lg shadow-[0_4px_16px_oklch(0_0_0/0.10)] py-1 overflow-hidden"
            >
              {options.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                  className={[
                    'flex items-center gap-2 w-full px-3 py-2 text-sm text-left transition-colors',
                    opt.value === value
                      ? 'bg-foreground/[0.06] text-foreground font-medium'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  ].join(' ')}
                >
                  {opt.value === value && <span className="w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />}
                  {opt.value !== value && <span className="w-1.5 h-1.5 shrink-0" />}
                  {opt.label}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function SortDirButton({ direction, onChange }: { direction: SortDirection; onChange: (d: SortDirection) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(direction === 'asc' ? 'desc' : 'asc')}
      title={direction === 'asc' ? 'Crescente' : 'Decrescente'}
      className="flex items-center justify-center w-8 h-8 rounded-md border border-input bg-background text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-150 shrink-0"
    >
      <motion.span
        key={direction}
        initial={{ opacity: 0, rotate: -45 }}
        animate={{ opacity: 1, rotate: 0 }}
        transition={{ duration: 0.15 }}
        className="flex"
      >
        {direction === 'asc' ? (
          <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M3 10V4M3 4l2 2M3 4L1 6M6 10h5M6 7h3M6 4h1" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M3 4v6M3 10l2-2M3 10L1 8M6 4h5M6 7h3M6 10h1" />
          </svg>
        )}
      </motion.span>
    </button>
  );
}

export function TasksSortBar({ value, onChange }: TasksSortBarProps) {
  return (
    <div className="flex items-center gap-2">
      <SelectPill
        icon={<ArrowUpDown className="w-3.5 h-3.5" />}
        label="Ordenar"
        value={value.sortField}
        options={SORT_OPTIONS}
        onChange={v => onChange({ sortField: v })}
      />
      <SortDirButton direction={value.sortDirection} onChange={d => onChange({ sortDirection: d })} />
      <SelectPill
        icon={<Layers className="w-3.5 h-3.5" />}
        label="Agrupar"
        value={value.groupBy}
        options={GROUP_OPTIONS}
        onChange={v => onChange({ groupBy: v })}
      />
    </div>
  );
}
