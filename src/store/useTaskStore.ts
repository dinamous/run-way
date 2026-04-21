import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { Task } from '@/lib/steps'

interface TaskState {
  optimisticTasks: Task[] | null
}

interface TaskActions {
  applyOptimisticUpdate: (tasks: Task[]) => void
  clearOptimistic: () => void
}

type TaskStore = TaskState & TaskActions

export const useTaskStore = create<TaskStore>()(
  devtools(
    (set) => ({
      optimisticTasks: null,

      applyOptimisticUpdate: (tasks) => set({ optimisticTasks: tasks }),
      clearOptimistic: () => set({ optimisticTasks: null }),
    }),
    { name: 'app/tasks', enabled: true }
  )
)
