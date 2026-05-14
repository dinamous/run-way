import { useState } from 'react';
import { Calendar, Lock, GripVertical } from 'lucide-react';
import { STEP_META } from '@/lib/steps';
import type { Task, Subtask, SubtaskProgressStatus } from '@/lib/steps';
import type { Member } from '@/hooks/infra/useSupabase';

const COLUMNS: { id: SubtaskProgressStatus; label: string; dot: string }[] = [
  { id: 'todo',          label: 'A Fazer',         dot: 'bg-slate-500' },
  { id: 'ready',         label: 'Pronta',          dot: 'bg-sky-400' },
  { id: 'in-progress',   label: 'Em Andamento',    dot: 'bg-blue-500' },
  { id: 'in-review',     label: 'Em Revisão',      dot: 'bg-violet-500' },
  { id: 'waiting',       label: 'Aguardando',      dot: 'bg-amber-400' },
  { id: 'blocked',       label: 'Bloqueada',       dot: 'bg-red-500' },
  { id: 'needs-changes', label: 'Precisa Ajustes', dot: 'bg-orange-400' },
  { id: 'paused',        label: 'Pausada',         dot: 'bg-zinc-500' },
  { id: 'done',          label: 'Concluída',       dot: 'bg-emerald-500' },
  { id: 'canceled',      label: 'Cancelada',       dot: 'bg-neutral-500' },
];

interface KanbanItem {
  task: Task;
  subtask: Subtask;
}

interface KanbanCardProps {
  item: KanbanItem;
  members: Member[];
  onEdit: (task: Task) => void;
  onDragStart: (e: React.DragEvent, taskId: string, subtaskId: string) => void;
}

function KanbanCard({ item, members, onEdit, onDragStart }: KanbanCardProps) {
  const { task, subtask } = item;
  const meta = STEP_META[subtask.status] ?? STEP_META['desenvolvimento'];
  const isBlocked = task.status?.blocked;

  const cardStyle = isBlocked
    ? 'bg-red-50 border-red-300 text-red-900 dark:bg-red-950/30 dark:border-red-800/80 dark:text-red-100'
    : 'bg-white border-zinc-200 text-zinc-900 dark:bg-zinc-900/80 dark:border-zinc-700/50 dark:text-zinc-100';

  const assignedMembers = members.filter((m) => subtask.assignees?.includes(m.id));

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task.id, subtask.id)}
      onClick={() => onEdit(task)}
      className={`
        group relative flex flex-col gap-2.5 p-3.5 mb-3 rounded-xl border
        cursor-grab active:cursor-grabbing hover:brightness-[1.03] transition-all
        shadow-sm hover:shadow-md animate-in fade-in-0 zoom-in-95 duration-200
        ${cardStyle}
      `}
    >
      {/* Header: grip + fase dot + task mãe */}
      <div className="flex items-center gap-2">
        <GripVertical className="w-3.5 h-3.5 shrink-0 text-zinc-400 group-hover:text-zinc-600 dark:text-white/20 dark:group-hover:text-white/40" />
        <div className={`w-1.5 h-1.5 shrink-0 rounded-full ${meta.dot}`} />
        <span className="text-[10px] text-zinc-400 dark:text-white/40 truncate leading-none">{task.title}</span>
        {isBlocked && (
          <span className="ml-auto flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded border border-red-200 shrink-0 dark:text-red-400 dark:bg-red-950/50 dark:border-red-900/50">
            <Lock className="w-2.5 h-2.5" /> Bloqueada
          </span>
        )}
      </div>

      {/* Título da subtask */}
      <h4 className="text-sm font-semibold text-zinc-800 dark:text-white/90 leading-snug pl-[22px]">
        {subtask.title}
      </h4>

      {/* Footer: fase badge + prazo + avatares */}
      <div className="flex items-center justify-between pl-[22px]">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-500 dark:bg-black/20 dark:border-white/10 dark:text-white/60">
            {meta.label}
          </span>
          {subtask.end && (
            <div className="flex items-center gap-1 text-[11px] text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded border border-zinc-200 dark:text-white/40 dark:bg-black/20 dark:border-white/5">
              <Calendar className="w-3 h-3" />
              <span>
                {new Date(subtask.end + 'T00:00:00').toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                })}
              </span>
            </div>
          )}
        </div>

        <div className="flex -space-x-1.5">
          {assignedMembers.length > 0 ? (
            assignedMembers.map((m) => (
              <div
                key={m.id}
                className="w-6 h-6 rounded-full border-2 border-white dark:border-zinc-900 bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-700 dark:text-white shadow-sm"
                title={m.name}
              >
                {m.avatar ?? m.name?.charAt(0)}
              </div>
            ))
          ) : (
            <div className="w-6 h-6 rounded-full border-2 border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-black/40 flex items-center justify-center">
              <span className="text-[10px] text-zinc-400 dark:text-white/30">?</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface KanbanViewProps {
  tasks: Task[];
  members: Member[];
  onEdit: (task: Task) => void;
  onUpdateTask: (task: Task) => void;
}

export function KanbanView({ tasks, members, onEdit, onUpdateTask }: KanbanViewProps) {
  const [boardTasks, setBoardTasks] = useState<Task[]>(tasks);
  const [dragged, setDragged] = useState<{ taskId: string; subtaskId: string } | null>(null);

  if (tasks !== boardTasks && dragged === null) {
    setBoardTasks(tasks);
  }

  // Demandas mãe concluídas ficam fora do Kanban
  const activeTasks = boardTasks.filter((t) => !t.concludedAt);

  // Expande tasks em itens individuais por subtask ativa
  const allItems: KanbanItem[] = activeTasks.flatMap((task) =>
    (task.subtasks ?? [])
      .filter((s) => s.active)
      .map((subtask) => ({ task, subtask })),
  );

  const handleDragStart = (e: React.DragEvent, taskId: string, subtaskId: string) => {
    setDragged({ taskId, subtaskId });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setDragImage(new Image(), 0, 0);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, columnId: SubtaskProgressStatus) => {
    e.preventDefault();
    if (!dragged) return;

    setBoardTasks((prev) =>
      prev.map((task) => {
        if (task.id !== dragged.taskId) return task;
        const updatedSubtasks = task.subtasks.map((s) =>
          s.id === dragged.subtaskId ? { ...s, progressStatus: columnId } : s,
        );
        const updatedTask = { ...task, subtasks: updatedSubtasks };
        onUpdateTask(updatedTask);
        return updatedTask;
      }),
    );
    setDragged(null);
  };

  const columnsData = COLUMNS.reduce<Record<string, KanbanItem[]>>((acc, col) => {
    acc[col.id] = allItems.filter((item) => (item.subtask.progressStatus ?? 'todo') === col.id);
    return acc;
  }, {});

  const DEFAULT_VISIBLE = new Set<SubtaskProgressStatus>(['todo', 'ready', 'in-progress', 'in-review']);
  const visibleColumns = COLUMNS.filter(
    (col) => DEFAULT_VISIBLE.has(col.id) || (columnsData[col.id]?.length ?? 0) > 0,
  );

  return (
    <div className="w-full h-full min-h-[700px] overflow-x-auto bg-zinc-50 dark:bg-[#0a0a0a] p-4 rounded-2xl custom-kanban-scrollbar">
      <div className="flex gap-5 min-w-max h-full">
        {visibleColumns.map((col) => (
          <div
            key={col.id}
            className="flex flex-col w-[300px] shrink-0"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, col.id)}
          >
            <div className="flex items-center gap-2.5 mb-4 pb-2 border-b border-zinc-200 dark:border-white/5">
              <div className={`w-2 h-2 rounded-full ${col.dot}`} />
              <h3 className="text-[13px] font-semibold text-zinc-700 dark:text-zinc-300">{col.label}</h3>
              <span className="text-[11px] font-medium bg-zinc-100 dark:bg-white/5 text-zinc-500 dark:text-zinc-400 px-2 py-0.5 rounded-full border border-zinc-200 dark:border-white/5">
                {columnsData[col.id]?.length ?? 0}
              </span>
            </div>

            <div
              className={`
                flex-1 flex flex-col p-2 rounded-2xl border transition-colors duration-300
                ${dragged
                  ? 'bg-zinc-100/80 border-zinc-300 border-dashed dark:bg-white/[0.02] dark:border-white/10'
                  : 'bg-transparent border-transparent'}
              `}
            >
              {columnsData[col.id]?.map((item) => (
                <KanbanCard
                  key={`${item.task.id}-${item.subtask.id}`}
                  item={item}
                  members={members}
                  onEdit={onEdit}
                  onDragStart={handleDragStart}
                />
              ))}

              {columnsData[col.id]?.length === 0 && (
                <div className="flex-1 min-h-[100px] flex items-center justify-center mt-2 rounded-xl border border-zinc-200 dark:border-white/5 bg-zinc-100/50 dark:bg-white/[0.01]">
                  <span className="text-xs text-zinc-400 dark:text-zinc-600 font-medium tracking-wide">
                    Nenhuma subtask
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .custom-kanban-scrollbar::-webkit-scrollbar { height: 8px; width: 8px; }
        .custom-kanban-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-kanban-scrollbar::-webkit-scrollbar-thumb { background: #d4d4d8; border-radius: 10px; }
        .custom-kanban-scrollbar::-webkit-scrollbar-thumb:hover { background: #a1a1aa; }
        .dark .custom-kanban-scrollbar::-webkit-scrollbar-thumb { background: #27272a; }
        .dark .custom-kanban-scrollbar::-webkit-scrollbar-thumb:hover { background: #3f3f46; }
      `}</style>
    </div>
  );
}

export default KanbanView;
