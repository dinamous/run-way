import React from 'react';
import { GripVertical, Users, Calendar, X, ChevronDown } from 'lucide-react';
import {
  STEP_META, STEP_TYPES_ORDER, SUBTASK_PROGRESS_META, SUBTASK_PROGRESS_STATUS_ORDER,
  type SubtaskStatus, type SubtaskProgressStatus,
} from '../../../lib/steps';
import type { Member } from '../../../hooks/infra/useSupabase';
import type { SubtaskDraft } from '../hooks/useSubtasks';

interface Props {
  subtask: SubtaskDraft;
  members: Member[];
  errors: Record<string, string>;
  updateSubtask: <K extends keyof SubtaskDraft>(id: string, field: K, value: SubtaskDraft[K]) => void;
  toggleAssignee: (id: string, memberId: string) => void;
  removeSubtask: (id: string) => void;
}

const SubtaskRow: React.FC<Props> = ({ subtask, members, errors, updateSubtask, toggleAssignee, removeSubtask }) => {
  const meta = STEP_META[subtask.status];

  return (
    <div
      className={`group relative flex flex-col lg:flex-row lg:items-center gap-4 p-3.5 bg-muted/30 border ${meta.color} rounded-xl hover:bg-muted/50 transition-colors`}
    >
      <div className="flex flex-1 items-center gap-3 min-w-0">
        <GripVertical className="w-4 h-4 text-muted-foreground/40 cursor-grab hover:text-muted-foreground shrink-0" />

        <div className="flex-1 flex flex-col gap-2 min-w-0">
          <input
            type="text"
            value={subtask.title}
            onChange={e => updateSubtask(subtask._tempId, 'title', e.target.value)}
            placeholder="Nome da subtask…"
            className="w-full bg-transparent text-sm font-semibold text-foreground placeholder:text-muted-foreground/40 outline-none border-b border-transparent focus:border-border pb-0.5 transition-colors"
          />

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <select
                value={subtask.status}
                onChange={e => updateSubtask(subtask._tempId, 'status', e.target.value as SubtaskStatus)}
                className="appearance-none bg-background border border-border text-foreground text-[11px] rounded px-2.5 py-1 pr-6 outline-none focus:ring-1 focus:ring-ring cursor-pointer transition-shadow"
              >
                {STEP_TYPES_ORDER.map(s => (
                  <option key={s} value={s}>{STEP_META[s].label}</option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-muted-foreground absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={subtask.progressStatus}
                onChange={e => updateSubtask(subtask._tempId, 'progressStatus', e.target.value as SubtaskProgressStatus)}
                className="appearance-none bg-background border border-border text-foreground text-[11px] rounded px-2.5 py-1 pr-6 outline-none focus:ring-1 focus:ring-ring cursor-pointer transition-shadow"
                title="Status da subtask"
              >
                {SUBTASK_PROGRESS_STATUS_ORDER.map(s => (
                  <option key={s} value={s}>{SUBTASK_PROGRESS_META[s].label}</option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-muted-foreground absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {errors[`${subtask._tempId}-title`] && (
            <span className="text-[10px] text-red-500">{errors[`${subtask._tempId}-title`]}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 lg:justify-end border-t border-border lg:border-none pt-3 lg:pt-0 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <div className="flex flex-wrap gap-1">
            {members.map(m => {
              const sel = subtask.assignees.includes(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggleAssignee(subtask._tempId, m.id)}
                  title={m.name}
                  className={`relative w-7 h-7 rounded-full overflow-hidden transition-all duration-150 ${
                    sel
                      ? 'ring-2 ring-primary ring-offset-1 ring-offset-card opacity-100 scale-110 z-10'
                      : 'opacity-40 grayscale hover:opacity-70 hover:grayscale-0'
                  }`}
                >
                  {m.avatar_url ? (
                    <img src={m.avatar_url} alt={m.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-muted border border-border flex items-center justify-center text-[10px] font-bold text-foreground">
                      {m.avatar}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center bg-background border border-border rounded-md overflow-hidden focus-within:ring-1 focus-within:ring-ring transition-all">
          <div className="flex items-center px-2.5 border-r border-border">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground mr-2 shrink-0" />
            <input
              type="date"
              value={subtask.start}
              onChange={e => updateSubtask(subtask._tempId, 'start', e.target.value)}
              className="bg-transparent text-[11px] font-mono text-foreground py-1.5 w-[90px] outline-none"
            />
          </div>
          <div className="flex items-center px-2.5">
            <span className="text-[10px] text-muted-foreground mr-2 font-medium">até</span>
            <input
              type="date"
              value={subtask.end}
              onChange={e => updateSubtask(subtask._tempId, 'end', e.target.value)}
              className="bg-transparent text-[11px] font-mono text-foreground py-1.5 w-[90px] outline-none"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => removeSubtask(subtask._tempId)}
          className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors lg:opacity-0 lg:group-hover:opacity-100 focus:opacity-100"
          aria-label="Remover subtask"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {errors[`${subtask._tempId}-dates`] && (
        <p className="absolute -bottom-4 right-10 text-[10px] text-red-500">
          {errors[`${subtask._tempId}-dates`]}
        </p>
      )}
    </div>
  );
};

export default SubtaskRow;
