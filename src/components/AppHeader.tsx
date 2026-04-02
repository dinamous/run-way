import { Sun, Moon, CalendarDays, LogOut } from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

type View = "dashboard" | "members" | "reports";

interface AppHeaderProps {
  darkMode: boolean;
  onToggleDark: () => void;
  userEmail?: string;
  onSignOut: () => void;
  view: View;
  onViewChange: (view: View) => void;
}

const VIEW_LABELS: Record<View, string> = {
  dashboard: "Calendário",
  members: "Membros",
  reports: "Relatórios",
};

export function AppHeader({ darkMode, onToggleDark, userEmail, onSignOut, view, onViewChange }: AppHeaderProps) {
  return (
    <header className="bg-card border-b border-border sticky top-0 z-10 print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-primary p-2 rounded-lg">
            <CalendarDays className="w-5 h-5 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground">
            Calendário de Demandas
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={onToggleDark}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Alternar tema"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="hidden sm:inline">{userEmail}</span>
            <Button variant="ghost" size="sm" onClick={onSignOut}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>

          <div className="h-6 w-px bg-border" />

          <div className="flex bg-muted rounded-lg p-1">
            {(["dashboard", "members", "reports"] as const).map((v) => (
              <button
                key={v}
                onClick={() => onViewChange(v)}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                  view === v
                    ? "bg-card shadow-sm text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {VIEW_LABELS[v]}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
