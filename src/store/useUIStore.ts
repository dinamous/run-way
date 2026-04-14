import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

export type ViewType =
  | 'home'
  | 'dashboard'
  | 'calendar-day'
  | 'calendar-week'
  | 'calendar-month'
  | 'members'
  | 'reports'
  | 'admin'
  | 'clients'
  | 'tools'
  | 'tools-briefing-analyzer'
  | 'tools-import'
  | 'tools-export'
  | 'tools-integrations'
export type DashboardMode = 'calendar' | 'timeline'

interface DashboardRedirect {
  assigneeId: string
  mode: DashboardMode
}

interface UIState {
  view: ViewType
  setView: (view: ViewType) => void

  dashboardRedirect: DashboardRedirect | null
  setDashboardRedirect: (redirect: DashboardRedirect) => void
  clearDashboardRedirect: () => void

  isTaskModalOpen: boolean
  openTaskModal: () => void
  closeTaskModal: () => void
}

export const useUIStore = create<UIState>()(devtools((set) => ({
  view: 'home',
  setView: (view) => set({ view }),

  dashboardRedirect: null,
  setDashboardRedirect: (dashboardRedirect) => set({ dashboardRedirect }),
  clearDashboardRedirect: () => set({ dashboardRedirect: null }),

  isTaskModalOpen: false,
  openTaskModal: () => set({ isTaskModalOpen: true }),
  closeTaskModal: () => set({ isTaskModalOpen: false }),
}), { name: 'app/ui', enabled: true }))
