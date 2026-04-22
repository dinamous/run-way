import { createContext, useContext } from "react"
import type { ClientOption } from "@/contexts/AuthContext"
import type { Holiday } from "@/utils/holidayUtils"
import type { Task } from "@/types/task"
import type { ViewType } from "@/store/useUIStore"
import type { AccessRole } from "@/lib/accessControl"
import type { Notification } from "@/types/notification"

interface HeaderCtx {
  darkMode: boolean
  onToggleDark: () => void
  notifications: Notification[]
  unreadCount: number
  selectedClientId: string | null
  onToggleMobileSidebar: () => void
  onMarkNotificationAsRead: (id: string) => Promise<void>
  onMarkAllNotificationsAsRead: () => Promise<void>
  onNotificationClick: (notification: Notification) => void
  onReloadNotifications: () => Promise<void>
}

interface SidebarCtx {
  sidebarOpen: boolean
  mobileSidebarOpen: boolean
  onToggleSidebar: () => void
  onCloseMobileSidebar: () => void
  view: ViewType
  onViewChange: (view: ViewType) => void
  hasClients: boolean
  role: AccessRole | null
  userEmail?: string
  userAvatarUrl?: string | null
  onSignOut: () => void
  selectedClient: ClientOption | null
  availableClients: ClientOption[]
  onSelectClient: (clientId: string | null | undefined) => void
  isAdmin: boolean
  darkMode: boolean
  onToggleDark: () => void
}

interface RouterCtx {
  effectiveClientId: string | null | undefined
  selectedClient: ClientOption | null
  userName: string
  userEmail?: string
  holidays: Holiday[]
  hasClients: boolean
  onViewChange: (view: ViewType) => void
  onEditTask: (task: Task) => void
  onOpenNewTask: () => void
  onDeleteTask: (id: string) => void
  onUpdateTask: (task: Task) => Promise<boolean>
}

interface LayoutCtx {
  header: HeaderCtx
  sidebar: SidebarCtx
  router: RouterCtx
  view: ViewType
}

const LayoutContext = createContext<LayoutCtx | null>(null)

export function useLayoutContext() {
  const ctx = useContext(LayoutContext)
  if (!ctx) throw new Error("useLayoutContext must be used within AppLayout")
  return ctx
}

export { LayoutContext }
export type { LayoutCtx, HeaderCtx, SidebarCtx, RouterCtx }
