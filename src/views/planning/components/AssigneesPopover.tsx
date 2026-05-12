import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Check } from 'lucide-react';
import type { Task } from '@/lib/steps';
import type { Member } from '@/hooks/infra/useSupabase';
import { MemberAvatars } from './MemberAvatars';
import { usePopover } from './usePopover';

interface AssigneesPopoverProps {
  subtask: Task['subtasks'][number];
  task: Task;
  members: Member[];
  onUpdate?: (task: Task, subtaskId: string, assignees: string[]) => Promise<boolean>;
}

export function AssigneesPopover({ subtask, task, members, onUpdate }: AssigneesPopoverProps) {
  const { open, setOpen, pos, anchorRef } = usePopover({ align: 'end', contentWidth: 208 });
  const [pending, setPending] = useState(false);
  const [localAssignees, setLocalAssignees] = useState<string[]>(subtask.assignees);

  function openPopover(e: React.MouseEvent) {
    e.stopPropagation();
    setLocalAssignees(subtask.assignees);
    setOpen(v => !v);
  }

  async function toggle(memberId: string) {
    if (!onUpdate || pending) return;
    const next = localAssignees.includes(memberId)
      ? localAssignees.filter(a => a !== memberId)
      : [...localAssignees, memberId];
    setLocalAssignees(next);
    setPending(true);
    await onUpdate(task, subtask.id, next);
    setPending(false);
  }

  const hasMember = localAssignees.length > 0;

  return (
    <div className="relative flex items-center justify-end">
      <button
        ref={anchorRef as React.RefObject<HTMLButtonElement>}
        type="button"
        onClick={openPopover}
        className={`flex items-center gap-1 rounded-full transition-colors focus:outline-none ${
          hasMember
            ? 'hover:opacity-80'
            : 'w-6 h-6 border border-dashed border-muted-foreground/30 hover:border-muted-foreground/60 justify-center text-muted-foreground/40 hover:text-muted-foreground/70'
        }`}
        title={hasMember ? 'Editar responsáveis' : 'Atribuir responsável'}
      >
        {hasMember
          ? <MemberAvatars assigneeIds={localAssignees} members={members} size="xs" />
          : <Plus className="w-3 h-3" />
        }
      </button>

      {open && createPortal(
        <div
          data-popover
          style={{ position: 'absolute', top: pos.top, left: pos.left, zIndex: 9999 }}
          className="w-52 rounded-lg border border-border bg-popover shadow-xl py-1"
          onClick={e => e.stopPropagation()}
        >
          <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Responsáveis
          </p>
          {members.map(m => {
            const selected = localAssignees.includes(m.id);
            return (
              <button
                key={m.id}
                type="button"
                disabled={pending}
                onClick={() => toggle(m.id)}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm hover:bg-muted/60 transition-colors disabled:opacity-50"
              >
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground font-bold text-[10px] flex items-center justify-center overflow-hidden shrink-0">
                  {m.avatar_url
                    ? <img src={m.avatar_url} alt={m.name} className="w-full h-full object-cover" />
                    : m.name.slice(0, 2).toUpperCase()
                  }
                </div>
                <span className="flex-1 text-left truncate text-foreground">{m.name}</span>
                <span className="text-[10px] text-muted-foreground/60 shrink-0">{m.role}</span>
                {selected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
              </button>
            );
          })}
          {members.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted-foreground">Nenhum membro disponível</p>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
