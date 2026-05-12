import { cn } from "@/lib/utils"
import { AppHeader } from "@/components/AppHeader"
import { AppSidebar } from "@/components/AppSidebar"
import { AppRouter } from "@/components/AppRouter"
import { TooltipProvider } from "@/components/ui"
import { LayoutContext } from "@/contexts/LayoutContext"
import type { ClientOption } from "@/contexts/AuthContext"
import type { Holiday } from "@/utils/holidayUtils"
import type { Task } from "@/types/task"
import type { ViewType } from "@/store/useUIStore"
import type { AccessRole } from "@/lib/accessControl"
import type { Notification } from "@/types/notification"

interface AppLayoutProps {
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
  onLoadOlderNotifications: () => Promise<void>
  hasMoreNotifications: boolean
  loadingOlderNotifications: boolean
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
  effectiveClientId: string | null | undefined
  userName: string
  holidays: Holiday[]
  onEditTask: (task: Task) => void
  onOpenNewTask: () => void
  onDeleteTask: (id: string) => void
  onUpdateTask: (task: Task) => Promise<boolean>
  urlTaskId: string | null
  onOpenTask: (taskId: string, subview?: "calendar" | "timeline" | "list") => void
  onCloseTask: () => void
}

export function AppLayout(props: AppLayoutProps) {
  const {
    darkMode, onToggleDark,
    notifications, unreadCount, selectedClientId,
    onToggleMobileSidebar, onMarkNotificationAsRead, onMarkAllNotificationsAsRead,
    onNotificationClick, onReloadNotifications,
    onLoadOlderNotifications, hasMoreNotifications, loadingOlderNotifications,
    sidebarOpen, mobileSidebarOpen, onToggleSidebar, onCloseMobileSidebar,
    view, onViewChange, hasClients, role,
    userEmail, userAvatarUrl, onSignOut,
    selectedClient, availableClients, onSelectClient, isAdmin,
    effectiveClientId, userName, holidays,
    onEditTask, onOpenNewTask, onDeleteTask, onUpdateTask,
    urlTaskId, onOpenTask, onCloseTask,
  } = props

  return (
    <LayoutContext.Provider value={{
      view,
      header: {
        darkMode, onToggleDark,
        notifications, unreadCount, selectedClientId,
        onToggleMobileSidebar,
        onMarkNotificationAsRead, onMarkAllNotificationsAsRead,
        onNotificationClick, onReloadNotifications,
        onLoadOlderNotifications, hasMoreNotifications, loadingOlderNotifications,
      },
      sidebar: {
        sidebarOpen, mobileSidebarOpen, onToggleSidebar, onCloseMobileSidebar,
        view, onViewChange, hasClients, role,
        userEmail, userAvatarUrl, onSignOut,
        selectedClient, availableClients, onSelectClient, isAdmin,
        darkMode, onToggleDark,
      },
      router: {
        effectiveClientId, selectedClient, userName, userEmail,
        holidays, hasClients, onViewChange,
        onEditTask, onOpenNewTask, onDeleteTask, onUpdateTask,
        urlTaskId, onOpenTask, onCloseTask,
      },
    }}>
      <div className="flex flex-col h-screen bg-background text-foreground font-sans">
        <AppHeader />

        <div className="flex flex-row flex-1 overflow-hidden">
          <AppSidebar />

          <main
            key={view}
            className={cn(
              "flex-1 overflow-auto animate-blur-fade-in",
              view === "home" ? "p-0" : "px-4 sm:px-6 lg:px-8 py-8"
            )}
          >
            <TooltipProvider>
              <AppRouter />
            </TooltipProvider>
          </main>
        </div>
      </div>
    </LayoutContext.Provider>
  )
}
