import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { Task } from '@/lib/steps';
import { usePopover } from './usePopover';

function formatDateRange(start: string, end: string): string {
  const fmt = (d: string) => {
    if (!d) return '—';
    const [, m, day] = d.split('-');
    return `${day}/${m}`;
  };
  if (!start && !end) return '—';
  if (!start) return `até ${fmt(end)}`;
  if (!end) return `de ${fmt(start)}`;
  return `${fmt(start)} → ${fmt(end)}`;
}

interface DatesPopoverProps {
  subtask: Task['subtasks'][number];
  task: Task;
  onUpdate?: (task: Task, subtaskId: string, start: string, end: string) => Promise<boolean>;
}

export function DatesPopover({ subtask, task, onUpdate }: DatesPopoverProps) {
  const { open, setOpen, pos, anchorRef } = usePopover();
  const [start, setStart] = useState(subtask.start ?? '');
  const [end, setEnd] = useState(subtask.end ?? '');
  const [pending, setPending] = useState(false);

  function openPopover(e: React.MouseEvent) {
    e.stopPropagation();
    if (!onUpdate) return;
    setStart(subtask.start ?? '');
    setEnd(subtask.end ?? '');
    setOpen(v => !v);
  }

  async function save() {
    if (!onUpdate || pending) return;
    setPending(true);
    const ok = await onUpdate(task, subtask.id, start, end);
    setPending(false);
    if (ok) setOpen(false);
  }

  const label = formatDateRange(subtask.start ?? '', subtask.end ?? '');

  return (
    <div>
      <button
        ref={anchorRef as React.RefObject<HTMLButtonElement>}
        type="button"
        onClick={openPopover}
        className={`text-[11px] text-muted-foreground/70 tabular-nums whitespace-nowrap font-mono transition-colors ${
          onUpdate
            ? 'hover:text-foreground hover:underline decoration-dashed underline-offset-2 cursor-pointer'
            : 'cursor-default'
        }`}
        title={onUpdate ? 'Editar período' : undefined}
      >
        {label}
      </button>

      {open && createPortal(
        <div
          data-popover
          style={{ position: 'absolute', top: pos.top, left: pos.left, zIndex: 9999 }}
          className="w-64 rounded-lg border border-border bg-popover shadow-xl p-3 space-y-3"
          onClick={e => e.stopPropagation()}
        >
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Período</p>
          <div className="space-y-2">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Início</label>
              <input
                type="date"
                value={start}
                onChange={e => setStart(e.target.value)}
                className="w-full text-xs border border-border rounded-md px-2 py-1.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Fim</label>
              <input
                type="date"
                value={end}
                min={start || undefined}
                onChange={e => setEnd(e.target.value)}
                className="w-full text-xs border border-border rounded-md px-2 py-1.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex-1 text-xs px-3 py-1.5 rounded-md border border-border hover:bg-muted/60 transition-colors text-muted-foreground"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={save}
              className="flex-1 text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {pending ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
