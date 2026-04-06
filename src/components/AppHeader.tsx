import { Sun, Moon, CalendarDays, PanelLeft, LogOut, User, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui";

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
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  selectedClient?: ClientOption | null;
  availableClients?: ClientOption[];
  onSelectClient?: (clientId: string | null | undefined) => void;
  isAdmin?: boolean;
}

function getInitials(email?: string): string {
  if (!email) return "?";
  const name = email.split("@")[0];
  const parts = name.split(/[._-]/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function AppHeader({
  darkMode,
  onToggleDark,
  userEmail,
  userAvatarUrl,
  onSignOut,
  sidebarOpen,
  onToggleSidebar,
  selectedClient,
  availableClients = [],
  onSelectClient,
  isAdmin,
}: AppHeaderProps) {
  const showClientSelector = availableClients.length > 1 || (isAdmin && availableClients.length > 0);

  return (
    <header className="bg-card border-b border-border sticky top-0 z-10 print:hidden">
      <div className="px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label={sidebarOpen ? "Fechar sidebar" : "Abrir sidebar"}
          >
            <PanelLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2">
            <div className="bg-primary p-2 rounded-lg">
              <CalendarDays className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold text-foreground hidden sm:block">
              Calendário de Demandas
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {showClientSelector ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-lg hover:bg-muted transition-colors">
                  {selectedClient ? (
                    <>
                      <span className="text-muted-foreground">Cliente:</span>
                      <span className="font-medium">{selectedClient.name}</span>
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

          <button
            onClick={onToggleDark}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Alternar tema"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

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
              <DropdownMenuItem onClick={onSignOut}>
                <LogOut className="w-4 h-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
