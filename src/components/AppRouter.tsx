import { lazy, Suspense } from "react";
import { RequireAdmin } from "@/components/RequireAdmin";
import { NoClientView } from "@/components/NoClientView";
import type { ViewType } from "@/store/useUIStore";
import type { ReportsSubview } from "@/views/reports/ReportsView";
import { useLayoutContext } from "@/contexts/LayoutContext";

const DashboardView  = lazy(() => import("@/views/dashboard").then(m => ({ default: m.DashboardView })));
const MembersView    = lazy(() => import("@/views/MembersView"));
const ReportsView    = lazy(() => import("@/views/reports"));
const AdminView      = lazy(() => import("@/views/admin").then(m => ({ default: m.AdminView })));
const UserClientsView = lazy(() => import("@/views/user/UserClientsView").then(m => ({ default: m.UserClientsView })));
const HomeView       = lazy(() => import("@/views/home").then(m => ({ default: m.HomeView })));
const ToolsView      = lazy(() => import("@/views/tools").then(m => ({ default: m.ToolsView })));
const TasksView      = lazy(() => import("@/views/tasks"));
const ProfileView    = lazy(() => import("@/views/profile").then(m => ({ default: m.ProfileView })));

function ViewSkeleton() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
    </div>
  );
}


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

export function AppRouter() {
  const { view, router: {
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
  } } = useLayoutContext()
  const goToClients = () => onViewChange("clients");
  const displayName = userName || userEmail || "";

  if (!hasClients && view !== "clients") {
    return <NoClientView hasClients={false} onGoToClients={goToClients} />;
  }

  if (hasClients && !effectiveClientId && view !== "clients") {
    return <NoClientView hasClients={true} onGoToClients={goToClients} />;
  }

  return (
    <Suspense fallback={<ViewSkeleton />}>
      {view === "home" && (
        <HomeView
          userName={displayName}
          clientName={selectedClient?.name}
          hasClient={!!effectiveClientId}
          onViewChange={onViewChange}
        />
      )}

      {view === "admin" && <RequireAdmin><AdminView /></RequireAdmin>}

      {view === "clients" && <UserClientsView client={selectedClient ?? null} />}

      {DASHBOARD_VIEWS.has(view) && (
        <DashboardView
          subview={view as DashboardSubview}
          onEdit={onEditTask}
          onDelete={onDeleteTask}
          onUpdateTask={onUpdateTask}
          onOpenNew={onOpenNewTask}
          onExport={() => window.print()}
          holidays={holidays}
        />
      )}

      {view === "demandas" && <TasksView onEdit={onEditTask} onOpenNew={onOpenNewTask} />}

      {view === "profile" && <ProfileView />}

      {view === "members" && <MembersView />}

      {TOOLS_VIEWS.has(view) && (
        <ToolsView subview={view === "tools" ? undefined : view as ToolsSubview} />
      )}

      {REPORTS_VIEWS.has(view) && <ReportsView subview={REPORTS_SUBVIEW_MAP[view]} />}

      {!view && (
        <HomeView
          userName={displayName}
          clientName={selectedClient?.name}
          hasClient={!!effectiveClientId}
          onViewChange={onViewChange}
        />
      )}
    </Suspense>
  );
}
