import { useState } from 'react';
import { Search, AlertCircle, CheckCircle2, X, ChevronDown, CalendarRange } from 'lucide-react';
import { motion, AnimatePresence, type Transition } from 'framer-motion';
import { Input } from '@/components/ui/Input';
import { STEP_META, STEP_TYPES_ORDER, SUBTASK_PROGRESS_META, SUBTASK_PROGRESS_STATUS_ORDER, type StepType, type SubtaskProgressStatus } from '@/lib/steps';
import type { Member } from '@/hooks/infra/useSupabase';

const EASE_OUT: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94];

export interface FiltersState {
  searchTerm: string;
  selectedSteps: StepType[];
  selectedProgressStatuses: SubtaskProgressStatus[];
  selectedMemberIds: string[];
  selectedPeriod: string;
  dateFrom: string;
  dateTo: string;
  showOnlyBlocked: boolean;
  showConcluded: boolean;
}

interface TasksFiltersProps {
  filters: FiltersState;
  members: Member[];
  onChange: (next: Partial<FiltersState>) => void;
  onClear: () => void;
}

const PILL_MOTION = {
  initial: { opacity: 0, scale: 0.88 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.14, ease: EASE_OUT } as Transition },
  exit: { opacity: 0, scale: 0.88, transition: { duration: 0.1 } as Transition },
};


// ─── Checkbox dropdown ────────────────────────────────────────────────────────

function CheckboxDropdown({
  label,
  icon,
  options,
  selected,
  onToggle,
}: {
  label: string;
  icon?: React.ReactNode;
  options: { value: string; label: string; dot?: string }[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const active = selected.length > 0;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={[
          'relative flex items-center gap-1.5 h-9 px-3 text-xs font-medium rounded-md border transition-all duration-150 whitespace-nowrap select-none',
          active
            ? 'bg-foreground text-background border-foreground'
            : 'bg-background text-muted-foreground border-input hover:bg-muted hover:text-foreground hover:border-border',
        ].join(' ')}
      >
        {icon && <span className="shrink-0 opacity-70">{icon}</span>}
        <span>{label}</span>
        {active && (
          <span className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold shrink-0 bg-background/20 text-background">
            {selected.length}
          </span>
        )}
        <ChevronDown className={`w-3 h-3 opacity-50 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.14, ease: EASE_OUT } }}
              exit={{ opacity: 0, y: -4, transition: { duration: 0.1 } }}
              className="absolute left-0 top-full mt-1.5 z-20 min-w-[200px] bg-popover border border-border rounded-lg shadow-[0_4px_16px_oklch(0_0_0/0.10)] py-1.5"
            >
              <div className="px-3 py-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">{label}</span>
              </div>
              {options.map(opt => {
                const checked = selected.includes(opt.value);
                return (
                  <label
                    key={opt.value}
                    className={[
                      'flex items-center gap-2.5 px-3 py-2 text-sm cursor-pointer select-none transition-colors',
                      checked ? 'bg-foreground/[0.05] text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    ].join(' ')}
                  >
                    <span className={['w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0', checked ? 'bg-foreground border-foreground' : 'border-input'].join(' ')}>
                      {checked && (
                        <svg className="w-2 h-2 text-background" viewBox="0 0 8 8" fill="none">
                          <path d="M1.5 4L3.5 6L6.5 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    <input type="checkbox" className="sr-only" checked={checked} onChange={() => onToggle(opt.value)} />
                    {opt.dot && <span className={`w-2 h-2 rounded-full shrink-0 ${opt.dot}`} />}
                    <span className="truncate">{opt.label}</span>
                  </label>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Date range picker ────────────────────────────────────────────────────────

function DateRangePicker({
  dateFrom,
  dateTo,
  onChange,
}: {
  dateFrom: string;
  dateTo: string;
  onChange: (from: string, to: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const active = !!(dateFrom || dateTo);

  const label = active
    ? dateFrom && dateTo
      ? `${dateFrom.slice(5)} → ${dateTo.slice(5)}`
      : dateFrom
        ? `A partir de ${dateFrom.slice(5)}`
        : `Até ${dateTo.slice(5)}`
    : 'Período';

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={[
          'flex items-center gap-1.5 h-9 px-3 text-xs font-medium rounded-md border transition-all duration-150 whitespace-nowrap select-none',
          active
            ? 'bg-foreground text-background border-foreground'
            : 'bg-background text-muted-foreground border-input hover:bg-muted hover:text-foreground hover:border-border',
        ].join(' ')}
      >
        <CalendarRange className="w-3.5 h-3.5 opacity-70 shrink-0" />
        <span>{label}</span>
        {active && (
          <span
            role="button"
            tabIndex={0}
            onClick={e => { e.stopPropagation(); onChange('', ''); }}
            onKeyDown={e => e.key === 'Enter' && (e.stopPropagation(), onChange('', ''))}
            className="ml-0.5 opacity-70 hover:opacity-100"
          >
            <X className="w-3 h-3" />
          </span>
        )}
        {!active && <ChevronDown className={`w-3 h-3 opacity-50 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.14, ease: EASE_OUT } }}
              exit={{ opacity: 0, y: -4, transition: { duration: 0.1 } }}
              className="absolute left-0 top-full mt-1.5 z-20 w-64 bg-popover border border-border rounded-lg shadow-[0_4px_16px_oklch(0_0_0/0.10)] p-4"
            >
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-3">Período personalizado</p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">De</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={e => onChange(e.target.value, dateTo)}
                    className="w-full h-9 px-3 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-shadow"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Até</label>
                  <input
                    type="date"
                    value={dateTo}
                    min={dateFrom}
                    onChange={e => onChange(dateFrom, e.target.value)}
                    className="w-full h-9 px-3 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-shadow"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => onChange('', '')}
                  className="flex-1 h-8 text-xs rounded-md border border-input text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  Limpar
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 h-8 text-xs rounded-md bg-foreground text-background font-medium hover:bg-foreground/90 transition-colors"
                >
                  Aplicar
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Member picker ────────────────────────────────────────────────────────────

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
  const active = selectedIds.length > 0;

  const triggerLabel = selectedIds.length === 0
    ? 'Responsável'
    : selectedIds.length === 1
      ? members.find(m => m.id === selectedIds[0])?.name?.split(' ')[0] ?? 'Responsável'
      : `${selectedIds.length} pessoas`;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={[
          'flex items-center gap-2 h-9 px-3 text-xs font-medium rounded-md border transition-all duration-150 whitespace-nowrap select-none',
          active
            ? 'bg-foreground text-background border-foreground'
            : 'bg-background text-muted-foreground border-input hover:bg-muted hover:text-foreground hover:border-border',
        ].join(' ')}
      >
        {active ? (
          <span className="flex items-center gap-0.5">
            {selectedIds.slice(0, 3).map((id, i) => {
              const m = members.find(m => m.id === id);
              return m ? (
                <span
                  key={id}
                  className={['w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center shrink-0 bg-background/25 text-background', i > 0 ? '-ml-1.5 ring-1 ring-background' : ''].join(' ')}
                  title={m.name}
                >
                  {m.avatar}
                </span>
              ) : null;
            })}
            {selectedIds.length > 3 && <span className="text-[10px] ml-1 opacity-70">+{selectedIds.length - 3}</span>}
          </span>
        ) : (
          <span className="opacity-50">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.5">
              <circle cx="8" cy="5" r="2.5" />
              <path d="M2.5 13.5c0-2.485 2.462-4.5 5.5-4.5s5.5 2.015 5.5 4.5" strokeLinecap="round" />
            </svg>
          </span>
        )}
        <span>{triggerLabel}</span>
        <ChevronDown className={`w-3 h-3 shrink-0 opacity-60 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.14, ease: EASE_OUT } }}
              exit={{ opacity: 0, y: -4, transition: { duration: 0.1 } }}
              className="absolute left-0 top-full mt-1.5 z-20 w-56 bg-popover border border-border rounded-lg shadow-[0_4px_16px_oklch(0_0_0/0.10)] py-1.5"
            >
              <div className="px-3 py-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">Responsável</span>
              </div>
              {members.map(m => {
                const sel = selectedIds.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onToggle(m.id)}
                    className={['flex items-center gap-2.5 px-3 py-2 w-full text-left text-sm transition-colors', sel ? 'bg-foreground/[0.05] text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'].join(' ')}
                  >
                    {m.avatar_url ? (
                      <img src={m.avatar_url} alt={m.name} className="w-6 h-6 rounded-full object-cover shrink-0 ring-1 ring-border" />
                    ) : (
                      <span className="w-6 h-6 rounded-full bg-foreground text-background text-[10px] font-bold flex items-center justify-center shrink-0">{m.avatar}</span>
                    )}
                    <span className="flex-1 truncate">{m.name}</span>
                    {sel && <span className="w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />}
                  </button>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Active filter chips ──────────────────────────────────────────────────────

function ActiveChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <motion.span
      {...PILL_MOTION}
      className="inline-flex items-center gap-1 h-6 pl-2.5 pr-1.5 text-[11px] font-medium rounded-full bg-foreground/[0.08] text-foreground border border-foreground/10 whitespace-nowrap"
    >
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="w-3.5 h-3.5 flex items-center justify-center rounded-full hover:bg-foreground/10 transition-colors ml-0.5"
      >
        <X className="w-2.5 h-2.5" />
      </button>
    </motion.span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TasksFilters({ filters, members, onChange, onClear }: TasksFiltersProps) {
  const {
    searchTerm, selectedSteps, selectedProgressStatuses,
    selectedMemberIds, dateFrom, dateTo,
    showOnlyBlocked, showConcluded,
  } = filters;

  const hasActiveFilters =
    searchTerm !== '' ||
    selectedSteps.length > 0 ||
    selectedProgressStatuses.length > 0 ||
    selectedMemberIds.length > 0 ||
    dateFrom !== '' || dateTo !== '' ||
    showOnlyBlocked ||
    showConcluded;

  function toggleStep(step: StepType) {
    const next = selectedSteps.includes(step) ? selectedSteps.filter(s => s !== step) : [...selectedSteps, step];
    onChange({ selectedSteps: next });
  }

  function toggleProgressStatus(status: SubtaskProgressStatus) {
    const next = selectedProgressStatuses.includes(status) ? selectedProgressStatuses.filter(s => s !== status) : [...selectedProgressStatuses, status];
    onChange({ selectedProgressStatuses: next });
  }

  function toggleMember(id: string) {
    const next = selectedMemberIds.includes(id) ? selectedMemberIds.filter(m => m !== id) : [...selectedMemberIds, id];
    onChange({ selectedMemberIds: next });
  }

  const categoryOptions = STEP_TYPES_ORDER.map(s => ({ value: s, label: STEP_META[s].label, dot: STEP_META[s].dot }));
  const statusOptions = SUBTASK_PROGRESS_STATUS_ORDER.map(s => ({ value: s, label: SUBTASK_PROGRESS_META[s].label }));

  // Build active chips
  const activeChips: { key: string; label: string; onRemove: () => void }[] = [];
  selectedSteps.forEach(s => activeChips.push({ key: `step-${s}`, label: STEP_META[s].label, onRemove: () => toggleStep(s) }));
  selectedProgressStatuses.forEach(s => activeChips.push({ key: `status-${s}`, label: SUBTASK_PROGRESS_META[s].label, onRemove: () => toggleProgressStatus(s) }));
  selectedMemberIds.forEach(id => {
    const m = members.find(m => m.id === id);
    if (m) activeChips.push({ key: `member-${id}`, label: m.name.split(' ')[0], onRemove: () => toggleMember(id) });
  });
  if (dateFrom || dateTo) activeChips.push({ key: 'date', label: dateFrom && dateTo ? `${dateFrom.slice(5)} → ${dateTo.slice(5)}` : dateFrom ? `De ${dateFrom.slice(5)}` : `Até ${dateTo.slice(5)}`, onRemove: () => onChange({ dateFrom: '', dateTo: '' }) });
  if (showOnlyBlocked) activeChips.push({ key: 'blocked', label: 'Bloqueadas', onRemove: () => onChange({ showOnlyBlocked: false }) });
  if (showConcluded) activeChips.push({ key: 'concluded', label: 'Concluídas', onRemove: () => onChange({ showConcluded: false }) });

  return (
    <div className="flex flex-col gap-2">

      {/* ── Row 1: Search ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50 pointer-events-none" />
          <Input
            type="text"
            placeholder="Pesquisar demanda, subtask ou ID..."
            value={searchTerm}
            onChange={e => onChange({ searchTerm: e.target.value })}
            className="pl-9 h-9 text-sm bg-background border-input placeholder:text-muted-foreground/40 focus-visible:ring-1"
          />
          <AnimatePresence>
            {searchTerm && (
              <motion.button
                {...PILL_MOTION}
                type="button"
                onClick={() => onChange({ searchTerm: '' })}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-3 h-3" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Row 2: Main filters ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <CheckboxDropdown
          label="Categoria"
          icon={
            <svg className="w-3 h-3" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="1.5">
              <rect x="1" y="1" width="4" height="4" rx="0.75" />
              <rect x="7" y="1" width="4" height="4" rx="0.75" />
              <rect x="1" y="7" width="4" height="4" rx="0.75" />
              <rect x="7" y="7" width="4" height="4" rx="0.75" />
            </svg>
          }
          options={categoryOptions}
          selected={selectedSteps}
          onToggle={v => toggleStep(v as StepType)}
        />

        <CheckboxDropdown
          label="Status"
          icon={
            <svg className="w-3 h-3" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="1.5">
              <circle cx="6" cy="6" r="4.5" />
              <path d="M6 3.5v2.75l1.75 1.75" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
          options={statusOptions}
          selected={selectedProgressStatuses}
          onToggle={v => toggleProgressStatus(v as SubtaskProgressStatus)}
        />

        <DateRangePicker
          dateFrom={dateFrom}
          dateTo={dateTo}
          onChange={(from, to) => onChange({ dateFrom: from, dateTo: to })}
        />

        {/* Separator */}
        <span className="w-px h-5 bg-border/60 shrink-0 mx-0.5" />

        <MemberAvatarPicker
          members={members}
          selectedIds={selectedMemberIds}
          onToggle={toggleMember}
        />

        {/* Blocked toggle */}
        <button
          type="button"
          onClick={() => onChange({ showOnlyBlocked: !showOnlyBlocked })}
          className={[
            'flex items-center gap-1.5 h-9 px-3 text-xs font-medium rounded-md border transition-all duration-150 whitespace-nowrap select-none',
            showOnlyBlocked
              ? 'bg-foreground text-background border-foreground'
              : 'bg-background text-muted-foreground border-input hover:bg-muted hover:text-foreground hover:border-border',
          ].join(' ')}
        >
          <AlertCircle className="w-3.5 h-3.5" />
          Bloqueadas
        </button>

        {/* Concluded toggle */}
        <button
          type="button"
          onClick={() => onChange({ showConcluded: !showConcluded })}
          className={[
            'flex items-center gap-1.5 h-9 px-3 text-xs font-medium rounded-md border transition-all duration-150 whitespace-nowrap select-none',
            showConcluded
              ? 'bg-foreground text-background border-foreground'
              : 'bg-background text-muted-foreground border-input hover:bg-muted hover:text-foreground hover:border-border',
          ].join(' ')}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Concluídas
        </button>

        {/* Clear all */}
        <AnimatePresence>
          {hasActiveFilters && (
            <>
              <motion.span {...PILL_MOTION} className="w-px h-5 bg-border/60 shrink-0 mx-0.5" />
              <motion.button
                {...PILL_MOTION}
                type="button"
                onClick={onClear}
                className="flex items-center gap-1 h-9 px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground rounded-md hover:bg-muted border border-transparent hover:border-input transition-all duration-150"
              >
                <X className="w-3 h-3" />
                Limpar
              </motion.button>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* ── Active filter chips ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {activeChips.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto', transition: { duration: 0.2, ease: EASE_OUT } }}
            exit={{ opacity: 0, height: 0, transition: { duration: 0.14 } }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40 mr-0.5">Ativos:</span>
              <AnimatePresence mode="popLayout">
                {activeChips.map(chip => (
                  <ActiveChip key={chip.key} label={chip.label} onRemove={chip.onRemove} />
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
