import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Check } from 'lucide-react';
import {
  SUBTASK_PROGRESS_META,
  SUBTASK_PROGRESS_STATUS_ORDER,
  type SubtaskProgressStatus,
  type Task,
} from '@/lib/steps';
import { usePopover } from './usePopover';

interface SubtaskProgressStatusPopoverProps {
  subtask: Task['subtasks'][number];
  task: Task;
  onUpdate?: (task: Task, subtaskId: string, status: SubtaskProgressStatus) => Promise<boolean>;
}

export function SubtaskProgressStatusPopover({ subtask, task, onUpdate }: SubtaskProgressStatusPopoverProps) {
  const { open, setOpen, pos, anchorRef } = usePopover({ contentWidth: 240 });
  const [pending, setPending] = useState(false);
  const currentStatus = subtask.progressStatus ?? 'todo';
  const meta = SUBTASK_PROGRESS_META[currentStatus];

  function openPopover(e: React.MouseEvent) {
    e.stopPropagation();
    if (!onUpdate) return;
    setOpen(v => !v);
  }

  async function selectStatus(status: SubtaskProgressStatus) {
    if (!onUpdate || pending || status === currentStatus) {
      setOpen(false);
      return;
    }
    setPending(true);
    const ok = await onUpdate(task, subtask.id, status);
    setPending(false);
    if (ok) setOpen(false);
  }

  return (
    <div>
      <button
        ref={anchorRef as React.RefObject<HTMLButtonElement>}
        type="button"
        onClick={openPopover}
        className={`max-w-[140px] truncate rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-opacity ${meta.className} ${
          onUpdate ? 'hover:opacity-80' : 'cursor-default'
        }`}
        title={onUpdate ? 'Editar status da subtask' : undefined}
      >
        {meta.label}
      </button>

      {open && createPortal(
        <div
          data-popover
          style={{ position: 'absolute', top: pos.top, left: pos.left, zIndex: 9999 }}
          className="w-60 rounded-lg border border-border bg-popover py-1 shadow-xl"
          onClick={e => e.stopPropagation()}
        >
          <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Status da subtask
          </p>
          {SUBTASK_PROGRESS_STATUS_ORDER.map(status => {
            const item = SUBTASK_PROGRESS_META[status];
            const selected = status === currentStatus;
            return (
              <button
                key={status}
                type="button"
                disabled={pending}
                onClick={() => selectStatus(status)}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-muted/60 disabled:opacity-50"
              >
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${item.className}`}>
                  {item.label}
                </span>
                <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                  {item.description}
                </span>
                {selected && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}
