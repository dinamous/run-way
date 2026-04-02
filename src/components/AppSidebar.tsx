import { CalendarDays, Users, BarChart2, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui";

type View = "dashboard" | "members" | "reports";

interface AppSidebarProps {
  open: boolean;
  onToggle: () => void;
  view: View;
  onViewChange: (view: View) => void;
}

const NAV_ITEMS: { view: View; label: string; Icon: React.ElementType }[] = [
  { view: "dashboard", label: "Calendário", Icon: CalendarDays },
  { view: "members",   label: "Membros",    Icon: Users },
  { view: "reports",   label: "Relatórios", Icon: BarChart2 },
];

export function AppSidebar({ open, onToggle, view, onViewChange }: AppSidebarProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <aside
        className={cn(
          "flex flex-col bg-card border-r border-border h-full transition-[width] duration-200 overflow-hidden shrink-0",
          open ? "w-[200px]" : "w-[56px]"
        )}
      >
        <nav className="flex flex-col gap-1 p-2 flex-1">
          {NAV_ITEMS.map(({ view: v, label, Icon }) => {
            const isActive = view === v;
            const item = (
              <button
                key={v}
                onClick={() => onViewChange(v)}
                className={cn(
                  "flex items-center gap-3 w-full rounded-md px-2 py-2 text-sm transition-colors",
                  open ? "" : "justify-center",
                  isActive
                    ? "bg-muted text-primary font-medium"
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
                <TooltipContent side="right">{label}</TooltipContent>
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
