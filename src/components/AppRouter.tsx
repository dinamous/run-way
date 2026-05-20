import { lazy, Suspense } from "react";
import { RequireAdmin } from "@/components/RequireAdmin";
import { NoClientView } from "@/components/NoClientView";
import { ViewShell } from "@/components/ViewShell";
import type { ViewType } from "@/store/useUIStore";
import type { ReportsSubview } from "@/views/reports/ReportsView";
import { useLayoutContext } from "@/contexts/LayoutContext";

const PlanningView   = lazy(() => import("@/views/planning").then(m => ({ default: m.PlanningView })));
const MembersView    = lazy(() => import("@/views/MembersView"));
const ReportsView    = lazy(() => import("@/views/reports"));
const AdminView      = lazy(() => import("@/views/admin").then(m => ({ default: m.AdminView })));
const UserClientsView = lazy(() => import("@/views/user/UserClientsView").then(m => ({ default: m.UserClientsView })));
const ToolsView      = lazy(() => import("@/views/tools").then(m => ({ default: m.ToolsView })));
const ProfileView    = lazy(() => import("@/views/profile").then(m => ({ default: m.ProfileView })));
const OverviewView   = lazy(() => import("@/views/overview").then(m => ({ default: m.OverviewView })));
const ClientOverviewView = lazy(() => import("@/views/client-overview").then(m => ({ default: m.ClientOverviewView })));

function ViewSkeleton() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
    </div>
  );
}

type PlanningSubview = "calendar" | "timeline" | "list" | "demandas" | "kanban";
type ToolsSubview = Extract<ViewType, "tools-briefing-analyzer" | "tools-import" | "tools-export" | "tools-integrations">;

const PLANNING_VIEWS = new Set<ViewType>(["calendar", "timeline", "list", "demandas", "kanban"]);
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
    selectedClient,
    effectiveClientId,
    userName,
    userEmail,
    userId,
    memberId,
    isAdmin,
    availableClients,
    notificationsLoading,
    holidays,
    onViewChange,
    onEditTask,
    onOpenNewTask,
    onDeleteTask,
    onUpdateTask,
    onSelectClient,
    onMarkNotificationAsRead,
  }, header: { notifications } } = useLayoutContext()
  const goToClients = () => onViewChange("clients");
  const displayName = userName || userEmail || "";

  if (!hasClients && view !== "clients") {
    return <NoClientView hasClients={false} onGoToClients={goToClients} />;
  }

  return (
    <Suspense fallback={<ViewSkeleton />}>
      {(view === "home" || !view) && !selectedClient && (
        <ViewShell viewOverride="home" noPadding>
          <OverviewView
            userName={displayName}
            userId={userId}
            memberId={memberId}
            isAdmin={isAdmin}
            clients={availableClients}
            notifications={notifications}
            notificationsLoading={notificationsLoading}
            onMarkNotificationAsRead={(id) => { onMarkNotificationAsRead(id).catch(() => {}) }}
            onSelectClient={(clientId) => onSelectClient(clientId)}
            onNavigateToPlanning={() => onViewChange("calendar")}
          />
        </ViewShell>
      )}

      {view === "home" && selectedClient && (
        <ViewShell viewOverride="home" noPadding>
          <ClientOverviewView clientId={effectiveClientId ?? null} />
        </ViewShell>
      )}

      {view === "client-overview" && (
        <ViewShell noPadding>
          <ClientOverviewView clientId={effectiveClientId ?? null} />
        </ViewShell>
      )}

      {view === "admin" && (
        <ViewShell>
          <RequireAdmin><AdminView /></RequireAdmin>
        </ViewShell>
      )}

      {view === "clients" && (
        <ViewShell>
          <UserClientsView client={selectedClient ?? null} />
        </ViewShell>
      )}

      {PLANNING_VIEWS.has(view) && (
        <ViewShell noPadding>
          <PlanningView
            subview={view as PlanningSubview}
            onViewChange={onViewChange}
            onEdit={onEditTask}
            onDelete={onDeleteTask}
            onUpdateTask={onUpdateTask}
            onOpenNew={onOpenNewTask}
            onExport={() => window.print()}
            holidays={holidays}
          />
        </ViewShell>
      )}

      {view === "profile" && (
        <ViewShell>
          <ProfileView />
        </ViewShell>
      )}

      {view === "members" && (
        <ViewShell>
          <MembersView />
        </ViewShell>
      )}

      {TOOLS_VIEWS.has(view) && (
        <ViewShell>
          <ToolsView subview={view === "tools" ? undefined : view as ToolsSubview} />
        </ViewShell>
      )}

      {REPORTS_VIEWS.has(view) && (
        <ViewShell>
          <ReportsView subview={REPORTS_SUBVIEW_MAP[view]} />
        </ViewShell>
      )}
    </Suspense>
  );
}
