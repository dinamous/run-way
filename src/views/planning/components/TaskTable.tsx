import { memo, useMemo, useState } from 'react';
import { Ban, CheckCircle2, UserPlus, X } from 'lucide-react';
import type { Task } from '@/lib/steps';
import type { Member } from '@/hooks/infra/useSupabase';
import { Button } from '@/components/ui/Button';
import { TaskTableRow } from './TaskTableRow';

interface TaskTableProps {
  tasks: Task[];
  members: Member[];
  onToggleBlock: (task: Task) => void;
  onConclude: (task: Task) => void;
  onEdit: (task: Task) => void;
  onBulkAssign?: (tasks: Task[], memberId: string) => Promise<boolean>;
  onBulkBlock?: (tasks: Task[]) => Promise<boolean>;
  onBulkConclude?: (tasks: Task[]) => Promise<boolean>;
  onReorder?: (tasks: Task[]) => Promise<boolean>;
  onUpdateSubtaskAssignees?: (task: Task, subtaskId: string, assignees: string[]) => Promise<boolean>;
  onUpdateSubtaskDates?: (task: Task, subtaskId: string, start: string, end: string) => Promise<boolean>;
}

export const TaskTable = memo(function TaskTable({
  tasks,
  members,
  onToggleBlock,
  onConclude,
  onEdit,
  onBulkAssign,
  onBulkBlock,
  onBulkConclude,
  onReorder,
  onUpdateSubtaskAssignees,
  onUpdateSubtaskDates,
}: TaskTableProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [assignOpen, setAssignOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<'assign' | 'block' | 'conclude' | null>(null);
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);

  const selectedTasks = useMemo(
    () => tasks.filter(task => selectedIds.includes(task.id)),
    [tasks, selectedIds],
  );
  const selectedCount = selectedTasks.length;

  if (tasks.length === 0) return null;

  function toggleSelection(taskId: string, selected: boolean) {
    setSelectedIds(prev => {
      if (selected) return prev.includes(taskId) ? prev : [...prev, taskId];
      return prev.filter(id => id !== taskId);
    });
  }

  async function runBulkAction(action: 'block' | 'conclude', handler?: (tasks: Task[]) => Promise<boolean>) {
    if (!handler || selectedTasks.length === 0 || pendingAction) return;
    setAssignOpen(false);
    setPendingAction(action);
    const success = await handler(selectedTasks);
    setPendingAction(null);
    if (success) setSelectedIds([]);
  }

  async function assignSelected(memberId: string) {
    if (!onBulkAssign || selectedTasks.length === 0 || pendingAction) return;
    setPendingAction('assign');
    const success = await onBulkAssign(selectedTasks, memberId);
    setPendingAction(null);
    if (success) {
      setAssignOpen(false);
      setSelectedIds([]);
    }
  }

  async function handleDrop(targetTaskId: string) {
    if (!dragTaskId || dragTaskId === targetTaskId || !onReorder) {
      setDragTaskId(null);
      setDragOverTaskId(null);
      return;
    }

    const fromIndex = tasks.findIndex(task => task.id === dragTaskId);
    const toIndex = tasks.findIndex(task => task.id === targetTaskId);
    if (fromIndex < 0 || toIndex < 0) {
      setDragTaskId(null);
      setDragOverTaskId(null);
      return;
    }

    const reordered = [...tasks];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    setDragTaskId(null);
    setDragOverTaskId(null);
    await onReorder(reordered);
  }

  return (
    <div className="space-y-2 pb-24">
      {tasks.map(task => (
        <TaskTableRow
          key={task.id}
          task={task}
          members={members}
          onToggleBlock={onToggleBlock}
          onConclude={onConclude}
          onEdit={onEdit}
          selected={selectedIds.includes(task.id)}
          onSelect={toggleSelection}
          defaultExpanded={tasks.length > 0}
          draggable={!!onReorder}
          dragging={dragTaskId === task.id}
          dragOver={dragOverTaskId === task.id && dragTaskId !== task.id}
          onDragStart={() => setDragTaskId(task.id)}
          onDragOver={() => setDragOverTaskId(task.id)}
          onDrop={() => handleDrop(task.id)}
          onDragEnd={() => { setDragTaskId(null); setDragOverTaskId(null); }}
          onUpdateSubtaskAssignees={onUpdateSubtaskAssignees}
          onUpdateSubtaskDates={onUpdateSubtaskDates}
        />
      ))}

      {selectedCount > 0 && (
        <div className="fixed inset-x-4 bottom-4 z-40 mx-auto max-w-3xl rounded-xl border border-border bg-popover/95 p-3 shadow-2xl backdrop-blur supports-[backdrop-filter]:bg-popover/85">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-foreground">
                {selectedCount} demanda{selectedCount !== 1 ? 's' : ''} selecionada{selectedCount !== 1 ? 's' : ''}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => setSelectedIds([])}
                aria-label="Limpar seleção"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!onBulkAssign || pendingAction !== null}
                  isLoading={pendingAction === 'assign'}
                  onClick={() => setAssignOpen(open => !open)}
                >
                  <UserPlus className="w-4 h-4" />
                  Atribuir {selectedCount} tarefa{selectedCount !== 1 ? 's' : ''}
                </Button>

                {assignOpen && (
                  <div className="absolute bottom-full left-0 mb-2 w-56 overflow-hidden rounded-lg border border-border bg-popover shadow-xl">
                    <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Responsável
                    </p>
                    {members.map(member => (
                      <button
                        key={member.id}
                        type="button"
                        disabled={pendingAction !== null}
                        onClick={() => assignSelected(member.id)}
                        className="flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-muted/60 disabled:opacity-50"
                      >
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                          {member.avatar_url
                            ? <img src={member.avatar_url} alt={member.name} className="h-full w-full object-cover" />
                            : member.name.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="flex-1 truncate text-left text-foreground">{member.name}</span>
                      </button>
                    ))}
                    {members.length === 0 && (
                      <p className="px-3 py-2 text-xs text-muted-foreground">Nenhum membro disponível</p>
                    )}
                  </div>
                )}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!onBulkConclude || pendingAction !== null}
                isLoading={pendingAction === 'conclude'}
                onClick={() => runBulkAction('conclude', onBulkConclude)}
              >
                <CheckCircle2 className="w-4 h-4" />
                Concluir {selectedCount} tarefa{selectedCount !== 1 ? 's' : ''}
              </Button>

              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={!onBulkBlock || pendingAction !== null}
                isLoading={pendingAction === 'block'}
                onClick={() => runBulkAction('block', onBulkBlock)}
              >
                <Ban className="w-4 h-4" />
                Bloquear selecionadas
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
