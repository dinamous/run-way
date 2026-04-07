import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

export type ViewType = 'home' | 'dashboard' | 'members' | 'reports' | 'admin' | 'clients'

interface UIState {
  view: ViewType
  setView: (view: ViewType) => void

  isTaskModalOpen: boolean
  openTaskModal: () => void
  closeTaskModal: () => void
}

export const useUIStore = create<UIState>()(devtools((set) => ({
  view: 'home',
  setView: (view) => set({ view }),

  isTaskModalOpen: false,
  openTaskModal: () => set({ isTaskModalOpen: true }),
  closeTaskModal: () => set({ isTaskModalOpen: false }),
}), { name: 'app/ui', enabled: true }))
