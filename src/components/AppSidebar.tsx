import { CalendarDays, Users, BarChart2, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui";
import { useAuthContext } from "@/contexts/AuthContext";

export type ViewType = "dashboard" | "members" | "reports" | "admin" | "clients";

interface AppSidebarProps {
  open: boolean;
  onToggle: () => void;
  view: ViewType;
  onViewChange: (view: ViewType) => void;
  hasClient?: boolean;
}

const BASE_NAV_ITEMS: { view: ViewType; label: string; Icon: React.ElementType; requiresClient?: boolean }[] = [
  { view: "dashboard", label: "Calendário", Icon: CalendarDays, requiresClient: true },
  { view: "members",   label: "Membros",    Icon: Users, requiresClient: true },
  { view: "reports",   label: "Relatórios", Icon: BarChart2, requiresClient: true },
  { view: "clients",   label: "Clientes",    Icon: Users, requiresClient: false },
];

export function AppSidebar({ open, onToggle, view, onViewChange, hasClient = true }: AppSidebarProps) {
  const { isAdmin } = useAuthContext();
  
  const NAV_ITEMS = BASE_NAV_ITEMS.filter(item => {
    if (item.view === "admin" && !isAdmin) return false;
    return true;
  }).map(item => {
    if (item.view === "admin") {
      return { ...item, view: "admin" as ViewType };
    }
    return item;
  });

  return (
    <TooltipProvider delayDuration={200}>
      <aside
        className={cn(
          "flex flex-col bg-card border-r border-border h-full transition-[width] duration-200 overflow-hidden shrink-0",
          open ? "w-[200px]" : "w-[56px]"
        )}
      >
        <nav className="flex flex-col gap-1 p-2 flex-1">
          {NAV_ITEMS.map(({ view: v, label, Icon, requiresClient }) => {
            const isActive = view === v;
            const isDisabled = requiresClient && !hasClient;
            const item = (
              <button
                key={v}
                onClick={() => !isDisabled && onViewChange(v)}
                disabled={isDisabled}
                className={cn(
                  "flex items-center gap-3 w-full rounded-md px-2 py-2 text-sm transition-colors",
                  open ? "" : "justify-center",
                  isActive
                    ? "bg-muted text-primary font-medium"
                    : isDisabled
                      ? "text-muted-foreground/50 cursor-not-allowed"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {open && <span>{label}</span>}
              </button>
            );

            if (open) return item;

            return (
              <Tooltip key={v}>
                <TooltipTrigger asChild>{item}</TooltipTrigger>
                <TooltipContent side="right">
                  {isDisabled ? "Selecione um cliente" : label}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

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
    </TooltipProvider>
  );
}