import { Menu, LayoutDashboard, Sun, Moon } from "lucide-react"
import { NotificationBell } from "./NotificationBell"
import { useLayoutContext } from "@/contexts/LayoutContext"

export function AppHeader() {
  const { header: {
    onToggleMobileSidebar,
    notifications,
    unreadCount,
    onMarkNotificationAsRead,
    onMarkAllNotificationsAsRead,
    onNotificationClick,
    onReloadNotifications,
    onLoadOlderNotifications,
    hasMoreNotifications,
    loadingOlderNotifications,
    selectedClientId,
    darkMode,
    onToggleDark,
  } } = useLayoutContext()

  return (
    <header className="app-header bg-surface-tinted sticky top-0 z-10 border-b border-border-strip print:hidden">
      <div className="px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleMobileSidebar}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors md:hidden"
            aria-label="Abrir menu"
          >
            <Menu className="w-4 h-4" />
          </button>
          <div className="app-header-logo-group flex items-center gap-2">
            <div className="app-header-logo-box bg-black dark:bg-white p-2 rounded-lg">
              <LayoutDashboard className="w-5 h-5 text-white dark:text-black" />
            </div>
            <h1 className="app-header-wordmark text-xl text-foreground hidden sm:block" style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800 }}>
              Run/Way
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onToggleDark}
            className="hidden md:flex items-center justify-center rounded-md p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Alternar tema"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <NotificationBell
            notifications={notifications}
            unreadCount={unreadCount}
            onMarkAsRead={onMarkNotificationAsRead}
            onMarkAllAsRead={onMarkAllNotificationsAsRead}
            onNotificationClick={onNotificationClick}
            reload={onReloadNotifications}
            onLoadOlder={onLoadOlderNotifications}
            hasMore={hasMoreNotifications}
            loadingOlder={loadingOlderNotifications}
            selectedClientId={selectedClientId ?? undefined}
          />
        </div>
      </div>
    </header>
  )
}
