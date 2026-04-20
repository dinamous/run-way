import { cn } from "@/lib/utils";
import { AppHeader } from "@/components/AppHeader";
import { AppSidebar } from "@/components/AppSidebar";
import { AppRouter } from "@/components/AppRouter";
import { TooltipProvider } from "@/components/ui";
import type { ClientOption } from "@/contexts/AuthContext";
import type { Holiday } from "@/utils/holidayUtils";
import type { Task } from "@/types/task";
import type { ViewType } from "@/store/useUIStore";
import type { AccessRole } from "@/lib/accessControl";
import type { Notification } from "@/types/notification";

interface AppLayoutProps {
  // header
  darkMode: boolean;
  onToggleDark: () => void;
  notifications: Notification[];
  unreadCount: number;
  selectedClientId: string | null;
  onToggleMobileSidebar: () => void;
  onMarkNotificationAsRead: (id: string) => Promise<void>;
  onMarkAllNotificationsAsRead: () => Promise<void>;
  onNotificationClick: (notification: Notification) => void;
  onReloadNotifications: () => Promise<void>;

  // sidebar
  sidebarOpen: boolean;
  mobileSidebarOpen: boolean;
  onToggleSidebar: () => void;
  onCloseMobileSidebar: () => void;
  view: ViewType;
  onViewChange: (view: ViewType) => void;
  hasClients: boolean;
  role: AccessRole | null;
  userEmail?: string;
  userAvatarUrl?: string | null;
  onSignOut: () => void;
  selectedClient: ClientOption | null;
  availableClients: ClientOption[];
  onSelectClient: (clientId: string | null | undefined) => void;
  isAdmin: boolean;

  // main / router
  effectiveClientId: string | null | undefined;
  userName: string;
  holidays: Holiday[];
  onEditTask: (task: Task) => void;
  onOpenNewTask: () => void;
  onDeleteTask: (id: string) => void;
  onUpdateTask: (task: Task) => Promise<boolean>;
}

export function AppLayout({
  darkMode, onToggleDark,
  notifications, unreadCount, selectedClientId,
  onToggleMobileSidebar, onMarkNotificationAsRead, onMarkAllNotificationsAsRead,
  onNotificationClick, onReloadNotifications,
  sidebarOpen, mobileSidebarOpen, onToggleSidebar, onCloseMobileSidebar,
  view, onViewChange, hasClients, role,
  userEmail, userAvatarUrl, onSignOut,
  selectedClient, availableClients, onSelectClient, isAdmin,
  effectiveClientId, userName, holidays,
  onEditTask, onOpenNewTask, onDeleteTask, onUpdateTask,
}: AppLayoutProps) {
  return (
    <div className="flex flex-col h-screen bg-background text-foreground font-sans">
      <AppHeader
        darkMode={darkMode}
        onToggleDark={onToggleDark}
        notifications={notifications}
        unreadCount={unreadCount}
        selectedClientId={selectedClientId}
        onToggleMobileSidebar={onToggleMobileSidebar}
        onMarkNotificationAsRead={onMarkNotificationAsRead}
        onMarkAllNotificationsAsRead={onMarkAllNotificationsAsRead}
        onNotificationClick={onNotificationClick}
        reloadNotifications={onReloadNotifications}
      />

      <div className="flex flex-row flex-1 overflow-hidden">
        <AppSidebar
          open={sidebarOpen}
          onToggle={onToggleSidebar}
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={onCloseMobileSidebar}
          view={view}
          onViewChange={onViewChange}
          hasClient={hasClients}
          role={role}
          darkMode={darkMode}
          onToggleDark={onToggleDark}
          userEmail={userEmail}
          userAvatarUrl={userAvatarUrl}
          onSignOut={onSignOut}
          selectedClient={selectedClient}
          availableClients={availableClients}
          onSelectClient={onSelectClient}
          isAdmin={isAdmin}
        />

        <main
          key={view}
          className={cn(
            "flex-1 overflow-auto animate-blur-fade-in",
            view === "home" ? "p-0" : "px-4 sm:px-6 lg:px-8 py-8"
          )}
        >
          <TooltipProvider>
            <AppRouter
              view={view}
              hasClients={hasClients}
              effectiveClientId={effectiveClientId}
              selectedClient={selectedClient}
              userName={userName}
              userEmail={userEmail}
              holidays={holidays}
              onViewChange={onViewChange}
              onEditTask={onEditTask}
              onOpenNewTask={onOpenNewTask}
              onDeleteTask={onDeleteTask}
              onUpdateTask={onUpdateTask}
            />
          </TooltipProvider>
        </main>
      </div>
    </div>
  );
}
