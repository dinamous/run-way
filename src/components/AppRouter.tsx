import { DashboardView } from "@/views/dashboard";
import MembersView from "@/views/MembersView";
import ReportsView from "@/views/reports";
import { AdminView } from "@/views/admin";
import { RequireAdmin } from "@/components/RequireAdmin";
import { UserClientsView } from "@/views/user/UserClientsView";
import { NoClientView } from "@/components/NoClientView";
import { HomeView } from "@/views/home";
import { ToolsView } from "@/views/tools";
import TasksView from "@/views/tasks";
import { ProfileView } from "@/views/profile";
import type { ViewType } from "@/store/useUIStore";
import type { Task } from "@/lib/steps";
import type { Holiday } from "@/utils/holidayUtils";
import type { ClientOption } from "@/contexts/AuthContext";
import type { ReportsSubview } from "@/views/reports/ReportsView";

type DashboardSubview = "calendar" | "timeline" | "list";
type ToolsSubview = Extract<ViewType, "tools-briefing-analyzer" | "tools-import" | "tools-export" | "tools-integrations">;

const DASHBOARD_VIEWS = new Set<ViewType>(["calendar", "timeline", "list"]);
const TOOLS_VIEWS = new Set<ViewType>(["tools", "tools-briefing-analyzer", "tools-import", "tools-export", "tools-integrations"]);
const REPORTS_VIEWS = new Set<ViewType>(["reports", "reports-fluxo", "reports-timeline", "reports-membros", "reports-alertas"]);

const REPORTS_SUBVIEW_MAP: Partial<Record<ViewType, ReportsSubview>> = {
  "reports": "geral",
  "reports-fluxo": "fluxo",
  "reports-timeline": "timeline",
  "reports-membros": "membros",
  "reports-alertas": "alertas",
};

interface AppRouterProps {
  view: ViewType;
  hasClients: boolean;
  effectiveClientId: string | null | undefined;
  selectedClient: ClientOption | null;
  userName: string;
  userEmail: string | undefined;
  holidays: Holiday[];
  onViewChange: (view: ViewType) => void;
  onEditTask: (task: Task) => void;
  onOpenNewTask: () => void;
  onDeleteTask: (id: string) => void;
  onUpdateTask: (task: Task) => Promise<boolean>;
}

/**
 * Maps the active `view` to the corresponding view component.
 * Handles guard conditions (no client selected) before delegating to the view.
 */
export function AppRouter({
  view,
  hasClients,
  effectiveClientId,
  selectedClient,
  userName,
  userEmail,
  holidays,
  onViewChange,
  onEditTask,
  onOpenNewTask,
  onDeleteTask,
  onUpdateTask,
}: AppRouterProps) {
  const goToClients = () => onViewChange("clients");
  const displayName = userName || userEmail || "";

  if (!hasClients && view !== "clients") {
    return <NoClientView hasClients={false} onGoToClients={goToClients} />;
  }

  if (hasClients && !effectiveClientId && view !== "clients") {
    return <NoClientView hasClients={true} onGoToClients={goToClients} />;
  }

  if (view === "home") {
    return (
      <HomeView
        userName={displayName}
        clientName={selectedClient?.name}
        hasClient={!!effectiveClientId}
        onViewChange={onViewChange}
      />
    );
  }

  if (view === "admin") {
    return <RequireAdmin><AdminView /></RequireAdmin>;
  }

  if (view === "clients") {
    return <UserClientsView client={selectedClient ?? null} />;
  }

  if (DASHBOARD_VIEWS.has(view)) {
    return (
      <DashboardView
        subview={view as DashboardSubview}
        onEdit={onEditTask}
        onDelete={onDeleteTask}
        onUpdateTask={onUpdateTask}
        onOpenNew={onOpenNewTask}
        onExport={() => window.print()}
        holidays={holidays}
      />
    );
  }

  if (view === "demandas") {
    return <TasksView onEdit={onEditTask} onOpenNew={onOpenNewTask} />;
  }

  if (view === "profile") {
    return <ProfileView />;
  }

  if (view === "members") {
    return <MembersView />;
  }

  if (TOOLS_VIEWS.has(view)) {
    return <ToolsView subview={view === "tools" ? undefined : view as ToolsSubview} />;
  }

  if (REPORTS_VIEWS.has(view)) {
    return <ReportsView subview={REPORTS_SUBVIEW_MAP[view]} />;
  }

  return (
    <HomeView
      userName={displayName}
      clientName={selectedClient?.name}
      hasClient={!!effectiveClientId}
      onViewChange={onViewChange}
    />
  );
}
