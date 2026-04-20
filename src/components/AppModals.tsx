import { ConfirmModal } from "@/components/ui";
import TaskModal from "@/components/TaskModal";
import { ClientTransitionOverlay } from "@/components/ClientTransitionOverlay";
import type { Task } from "@/types/task";
import type { Member } from "@/types/member";
import type { Holiday } from "@/utils/holidayUtils";

interface TaskModalState {
  isOpen: boolean;
  editingTask: Task | null;
  onClose: () => void;
  onSave: (taskData: Omit<Task, "id" | "createdAt">) => Promise<void>;
  onDelete: (id: string) => void;
}

interface DeleteModalState {
  pendingId: string | null;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

interface TransitionState {
  target: { id: string | null | undefined; name: string } | null;
  onComplete: () => void;
}

interface AppModalsProps {
  taskModal: TaskModalState;
  deleteModal: DeleteModalState;
  transition: TransitionState;
  members: Member[];
  holidays: Holiday[];
}

export function AppModals({ taskModal, deleteModal, transition, members, holidays }: AppModalsProps) {
  return (
    <>
      {taskModal.isOpen && (
        <TaskModal
          task={taskModal.editingTask}
          members={members}
          holidays={holidays}
          onClose={taskModal.onClose}
          onSave={taskModal.onSave}
          onDelete={(id) => taskModal.onDelete(id)}
        />
      )}

      {transition.target && (
        <ClientTransitionOverlay
          clientName={transition.target.name}
          onComplete={transition.onComplete}
        />
      )}

      {deleteModal.pendingId && (
        <ConfirmModal
          title="Eliminar demanda"
          message="Tem a certeza que deseja eliminar esta demanda?"
          confirmLabel="Eliminar demanda"
          cancelLabel="Cancelar"
          onConfirm={deleteModal.onConfirm}
          onCancel={deleteModal.onCancel}
        />
      )}
    </>
  );
}
