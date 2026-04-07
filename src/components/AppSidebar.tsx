import { CalendarDays, Users, BarChart2, ChevronLeft, ChevronRight, Home, Building2, Settings, X, Sun, Moon, User, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui";
import { canAccessView, type AccessRole } from "@/lib/accessControl";
import type { ViewType } from "@/store/useUIStore";
export type { ViewType } from "@/store/useUIStore";

interface AppSidebarProps {
  open: boolean;
  onToggle: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
  view: ViewType;
  onViewChange: (view: ViewType) => void;
  hasClient?: boolean;
  role: AccessRole | null;
  darkMode?: boolean;
  onToggleDark?: () => void;
  userEmail?: string;
  userAvatarUrl?: string | null;
  onSignOut?: () => void;
}

const BASE_NAV_ITEMS: { view: ViewType; label: string; Icon: React.ElementType; requiresClient?: boolean; isAdminOnly?: boolean }[] = [
  { view: "home",      label: "Início",     Icon: Home },
  { view: "dashboard", label: "Calendário", Icon: CalendarDays, requiresClient: true },
  { view: "members",   label: "Membros",    Icon: Users, requiresClient: true },
  { view: "reports",   label: "Relatórios", Icon: BarChart2, requiresClient: true },
  { view: "clients",   label: "Clientes",   Icon: Building2, requiresClient: false },
  { view: "admin",     label: "Admin",      Icon: Settings, requiresClient: false, isAdminOnly: true },
];

function getInitials(email?: string): string {
  if (!email) return "?";
  const name = email.split("@")[0];
  const parts = name.split(/[._-]/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function AppSidebar({
  open,
  onToggle,
  mobileOpen = false,
  onCloseMobile,
  view,
  onViewChange,
  hasClient = true,
  role,
  darkMode,
  onToggleDark,
  userEmail,
  userAvatarUrl,
  onSignOut,
}: AppSidebarProps) {

  const NAV_ITEMS = BASE_NAV_ITEMS.filter(item => {
    if (item.isAdminOnly && role !== 'admin') return false;
    return canAccessView(item.view, role, hasClient || !item.requiresClient);
  });

  const renderNavItem = (expanded: boolean, isMobile: boolean) => NAV_ITEMS.map(({ view: v, label, Icon, requiresClient }) => {
    const isActive = view === v;
    const isDisabled = requiresClient && !hasClient;
    const item = (
      <button
        key={v}
        onClick={() => {
          if (isDisabled) return;
          onViewChange(v);
          if (isMobile) onCloseMobile?.();
        }}
        disabled={isDisabled}
        className={cn(
          "flex items-center gap-3 w-full rounded-md px-2 transition-colors",
          isMobile ? "py-1.5 text-xs" : "py-2 text-sm",
          expanded ? "" : "justify-center",
          isActive
            ? "bg-muted text-primary font-medium"
            : isDisabled
              ? "text-muted-foreground/50 cursor-not-allowed"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <Icon className="w-4 h-4 shrink-0" />
        {expanded && <span>{label}</span>}
      </button>
    );

    if (expanded || isMobile) return item;

    return (
      <Tooltip key={v}>
        <TooltipTrigger asChild>{item}</TooltipTrigger>
        <TooltipContent side="right">
          {isDisabled ? "Selecione um cliente" : label}
        </TooltipContent>
      </Tooltip>
    );
  });

  return (
    <TooltipProvider delayDuration={200}>
      <>
        <div
          className={cn(
            "fixed inset-0 bg-black/40 z-40 md:hidden transition-opacity",
            mobileOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
          onClick={onCloseMobile}
        />
        <aside
          className={cn(
            "fixed inset-y-0 left-0 w-[260px] bg-card border-r border-border z-50 md:hidden transition-transform flex flex-col",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="p-2 border-b border-border flex justify-end h-16 items-center">
            <button
              onClick={onCloseMobile}
              className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
              aria-label="Fechar menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col">
            <nav className="flex flex-col gap-1 p-2 flex-1 overflow-y-auto">{renderNavItem(true, true)}</nav>
            <div className="border-t border-border p-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={onToggleDark}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  aria-label="Alternar tema"
                >
                  {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                </button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-md border border-border px-2 text-left hover:bg-muted transition-colors"
                      aria-label="Menu do utilizador"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-[9px] font-semibold text-primary-foreground">
                        {userAvatarUrl ? (
                          <img src={userAvatarUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          getInitials(userEmail)
                        )}
                      </span>
                      <span className="truncate text-[11px] text-foreground">{userEmail ?? "Utilizador"}</span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 text-xs">
                    <DropdownMenuLabel className="text-[11px]">{userEmail ?? "Utilizador"}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem disabled className="text-[11px]">
                      <User className="w-4 h-4" />
                      Perfil
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onSignOut} className="text-[11px]">
                      <LogOut className="w-4 h-4" />
                      Sair
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </aside>

        <aside
          className={cn(
            "hidden md:flex md:flex-col bg-card border-r border-border h-full transition-[width] duration-200 overflow-hidden shrink-0",
            open ? "md:w-[200px]" : "md:w-[56px]"
          )}
        >
          <nav className="flex flex-col gap-1 p-2 flex-1">{renderNavItem(open, false)}</nav>

          <div className="p-2 border-t border-border">
            <button
              onClick={onToggle}
              className={cn(
                "flex items-center w-full rounded-md px-2 py-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors",
                open ? "justify-end" : "justify-center"
              )}
              aria-label={open ? "Recolher sidebar" : "Expandir sidebar"}
            >
              {open ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </aside>
      </>
    </TooltipProvider>
  );
}
