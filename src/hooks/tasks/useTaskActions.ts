import { useState, useCallback } from "react";
import { toast } from "sonner";
import { useUIStore } from "@/store/useUIStore";
import type { Task } from "@/lib/steps";

interface UseTaskActionsParams {
  createTask: (data: Omit<Task, "id" | "createdAt">) => Promise<boolean>;
  updateTask: (task: Task) => Promise<boolean>;
  deleteTask: (id: string) => Promise<boolean>;
  effectiveClientId: string | null | undefined;
}

/**
 * Encapsulates task modal state and CRUD handlers (create, update, delete).
 * Keeps App.tsx free of task-specific imperative logic.
 */
export function useTaskActions({
  createTask,
  updateTask,
  deleteTask,
  effectiveClientId,
}: UseTaskActionsParams) {
  const openTaskModal = useUIStore((s) => s.openTaskModal);
  const closeTaskModal = useUIStore((s) => s.closeTaskModal);

  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [pendingDeleteTaskId, setPendingDeleteTaskId] = useState<string | null>(null);
  const [closeModalOnDelete, setCloseModalOnDelete] = useState(false);

  const openNewTask = useCallback(() => {
    setEditingTask(null);
    openTaskModal();
  }, [openTaskModal]);

  const openEditTask = useCallback((task: Task) => {
    setEditingTask(task);
    openTaskModal();
  }, [openTaskModal]);

  const requestDeleteTask = useCallback((id: string, closeModalAfterDelete = false) => {
    setPendingDeleteTaskId(id);
    setCloseModalOnDelete(closeModalAfterDelete);
  }, []);

  const cancelDeleteTask = useCallback(() => {
    setPendingDeleteTaskId(null);
    setCloseModalOnDelete(false);
  }, []);

  const confirmDeleteTask = useCallback(async () => {
    if (!pendingDeleteTaskId) return;

    const taskId = pendingDeleteTaskId;
    const shouldCloseModal = closeModalOnDelete;

    setPendingDeleteTaskId(null);
    setCloseModalOnDelete(false);

    const ok = await deleteTask(taskId);
    if (!ok) {
      toast.error("Erro ao eliminar tarefa");
      return;
    }

    if (shouldCloseModal) closeTaskModal();
  }, [pendingDeleteTaskId, closeModalOnDelete, deleteTask, closeTaskModal]);

  const saveTask = useCallback(async (taskData: Omit<Task, "id" | "createdAt">) => {
    let ok: boolean;

    if (editingTask) {
      ok = await updateTask({
        ...editingTask,
        ...taskData,
        clientId: effectiveClientId ?? editingTask.clientId,
      });
    } else {
      ok = await createTask({
        ...taskData,
        clientId: effectiveClientId ?? taskData.clientId,
      });
    }

    if (!ok) {
      toast.error("Erro ao guardar tarefa");
      return;
    }

    closeTaskModal();
  }, [editingTask, effectiveClientId, updateTask, createTask, closeTaskModal]);

  return {
    editingTask,
    pendingDeleteTaskId,
    openNewTask,
    openEditTask,
    requestDeleteTask,
    cancelDeleteTask,
    confirmDeleteTask,
    saveTask,
  };
}
