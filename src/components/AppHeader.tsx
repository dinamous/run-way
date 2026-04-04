import { Sun, Moon, CalendarDays, PanelLeft, LogOut, User } from "lucide-react";
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
  onSignOut: () => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  selectedClient?: ClientOption | null;
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
  onSignOut,
  sidebarOpen,
  onToggleSidebar,
  selectedClient,
}: AppHeaderProps) {
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
          {selectedClient && (
            <span className="text-sm text-muted-foreground">
              Cliente: <span className="font-medium text-foreground">{selectedClient.name}</span>
            </span>
          )}

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
                className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
                aria-label="Menu do utilizador"
              >
                {getInitials(userEmail)}
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
