import { Sun, Moon, LogOut, User, ChevronDown, Menu, LayoutDashboard } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui";
import { NotificationBell } from "./NotificationBell";
import type { Notification } from "@/types/notification";

interface ClientOption {
  id: string;
  name: string;
}

interface AppHeaderProps {
  darkMode: boolean;
  onToggleDark: () => void;
  userEmail?: string;
  userAvatarUrl?: string | null;
  onSignOut: () => void;
  selectedClient?: ClientOption | null;
  availableClients?: ClientOption[];
  onSelectClient?: (clientId: string | null | undefined) => void;
  isAdmin?: boolean;
  onToggleMobileSidebar?: () => void;
  notifications?: Notification[];
  unreadCount?: number;
  onMarkNotificationAsRead?: (notificationId: string) => void;
  onMarkAllNotificationsAsRead?: () => void;
  onNotificationClick?: (notification: Notification) => void;
  reloadNotifications?: () => void;
}

export function AppHeader({
  darkMode,
  onToggleDark,
  userEmail,
  userAvatarUrl,
  onSignOut,
  selectedClient,
  availableClients = [],
  onSelectClient,
  isAdmin,
  onToggleMobileSidebar,
  notifications = [],
  unreadCount = 0,
  onMarkNotificationAsRead,
  onMarkAllNotificationsAsRead,
  onNotificationClick,
  reloadNotifications,
}: AppHeaderProps) {
  function getInitials(email?: string): string {
    if (!email) return "?";
    const name = email.split("@")[0];
    const parts = name.split(/[._-]/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }

  const showClientSelector = availableClients.length > 1 || (isAdmin && availableClients.length > 0);

  return (
    <header className="bg-card border-b border-border sticky top-0 z-10 print:hidden">
      <div className="px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleMobileSidebar}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors md:hidden"
            aria-label="Abrir menu"
          >
            <Menu className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <div className="bg-black dark:bg-white p-2 rounded-lg">
              <LayoutDashboard className="w-5 h-5 text-white dark:text-black" />
            </div>
            <h1 className="text-xl text-foreground hidden sm:block" style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800 }}>
              Run/Way
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {showClientSelector ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 text-xs sm:text-sm border rounded-lg hover:bg-muted transition-colors max-w-[180px] sm:max-w-none">
                  {selectedClient ? (
                    <>
                      <span className="text-muted-foreground hidden sm:inline">Cliente:</span>
                      <span className="font-medium truncate">{selectedClient.name}</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">Selecionar cliente...</span>
                  )}
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {isAdmin && (
                  <>
                    <DropdownMenuItem
                      onClick={() => onSelectClient?.(null)}
                      className={!selectedClient ? "font-semibold" : ""}
                    >
                      Todos os clientes
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {availableClients.map(client => (
                  <DropdownMenuItem
                    key={client.id}
                    onClick={() => onSelectClient?.(client.id)}
                    className={selectedClient?.id === client.id ? "font-semibold" : ""}
                  >
                    {client.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : selectedClient ? (
            <span className="text-sm text-muted-foreground">
              Cliente: <span className="font-medium text-foreground">{selectedClient.name}</span>
            </span>
          ) : null}

          <div className="hidden md:flex md:items-center md:gap-3">
            <button
              onClick={onToggleDark}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Alternar tema"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <NotificationBell
              notifications={notifications}
              unreadCount={unreadCount}
              onMarkAsRead={onMarkNotificationAsRead ?? (() => {})}
              onMarkAllAsRead={onMarkAllNotificationsAsRead ?? (() => {})}
              onNotificationClick={onNotificationClick ?? (() => {})}
              reload={reloadNotifications}
              selectedClientId={selectedClient?.id}
            />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors overflow-hidden"
                  aria-label="Menu do utilizador"
                >
                  {userAvatarUrl ? (
                    <img src={userAvatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    getInitials(userEmail)
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>{userEmail ?? "Utilizador"}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled>
                  <User className="w-4 h-4" />
                  Perfil
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onSignOut(); }}>
                  <LogOut className="w-4 h-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
