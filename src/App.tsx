import { useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useClientStore } from "@/store/useClientStore";
import { useUIStore } from "@/store/useUIStore";
import { useMemberStore } from "@/store/useMemberStore";
import { useTaskStore } from "@/store/useTaskStore";
import { useAuthContext } from "@/contexts/AuthContext";
import { useSupabase } from "@/hooks/useSupabase";
import { useHolidays } from "@/hooks/useHolidays";
import { useNotifications } from "@/hooks/useNotifications";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useAppSidebar } from "@/hooks/useAppSidebar";
import { useTaskActions } from "@/hooks/useTaskActions";
import { useClientTransition } from "@/hooks/useClientTransition";
import { resolveNotificationRoute } from "@/lib/notifications";
import { canAccessView, resolveAccessRole } from "@/lib/accessControl";
import { Toaster, toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { AppSidebar } from "@/components/AppSidebar";
import { AppRouter } from "@/components/AppRouter";
import { ClientTransitionOverlay } from "@/components/ClientTransitionOverlay";
import { ConfirmModal, TooltipProvider } from "@/components/ui";
import TaskModal from "@/components/TaskModal";
import { LoginView } from "@/views/login";
import { OnboardingView } from "@/views/onboarding";
import type { Notification } from "@/types/notification";
import type { ViewType } from "@/store/useUIStore";

export default function App() {
  const {
    session,
    user,
    signIn,
    signOut,
    authError,
    loading: authLoading,
    isAdmin,
    member,
    clients,
    refreshProfile,
  } = useAuthContext();

  const { darkMode, toggleDark } = useAppTheme();
  const { sidebarOpen, mobileSidebarOpen, toggleSidebar, openMobileSidebar, closeMobileSidebar } = useAppSidebar();

  const accessRole = resolveAccessRole(member);
  const hasClients = clients.length > 0;

  const { selectedClientId, setClient } = useClientStore();
  const { members, fetchMembers } = useMemberStore();
  const { fetchTasks } = useTaskStore();

  const effectiveClientId =
    selectedClientId === undefined
      ? hasClients ? clients[0].id : null
      : isAdmin
        ? selectedClientId
        : selectedClientId ?? (hasClients ? clients[0].id : null);

  // Resolve the active client on auth load and keep it in sync with available clients
  useEffect(() => {
    if (authLoading || !session) return;

    let resolvedClientId: string | null | undefined = selectedClientId;

    if (selectedClientId === undefined && hasClients) {
      setClient(clients[0].id);
      resolvedClientId = clients[0].id;
    } else if (!hasClients) {
      setClient(undefined);
      resolvedClientId = null;
    } else if (typeof selectedClientId === "string" && !clients.find((c) => c.id === selectedClientId)) {
      setClient(clients[0]?.id ?? undefined);
      resolvedClientId = clients[0]?.id ?? null;
    }

    if (resolvedClientId !== undefined) {
      fetchTasks(resolvedClientId, isAdmin);
      fetchMembers(resolvedClientId);
    }
  }, [authLoading, session, hasClients, clients, selectedClientId, setClient, fetchTasks, fetchMembers, isAdmin]);

  const { createTask, updateTask, deleteTask } = useSupabase({
    memberId: member?.id,
    clientId: effectiveClientId,
    isAdmin,
  });

  const { holidays } = useHolidays();

  const allClientIds = clients.map((c) => c.id);
  const {
    notifications,
    unreadCount,
    markAsRead: markNotificationAsRead,
    markAllAsRead: markAllNotificationsAsRead,
    reload: reloadNotifications,
  } = useNotifications(member?.id, allClientIds);

  const view = useUIStore((s) => s.view);
  const setView = useUIStore((s) => s.setView);
  const isModalOpen = useUIStore((s) => s.isTaskModalOpen);
  const closeTaskModal = useUIStore((s) => s.closeTaskModal);

  const { transitionTarget, selectClient, onTransitionComplete } = useClientTransition(
    clients,
    effectiveClientId
  );

  const { editingTask, pendingDeleteTaskId, openNewTask, openEditTask, requestDeleteTask, cancelDeleteTask, confirmDeleteTask, saveTask } =
    useTaskActions({ createTask, updateTask, deleteTask, effectiveClientId });

  const handleNotificationClick = useCallback((notification: Notification) => {
    const route = resolveNotificationRoute(notification);
    if (!route) return;

    if (route.startsWith("/dashboard")) setView("calendar");
    else if (route === "/profile") setView("profile");
    else if (route === "/clients") setView("clients");
  }, [setView]);

  const handleViewChange = useCallback((newView: ViewType) => {
    closeMobileSidebar();
    const hasClientSelected = effectiveClientId !== null;
    const canAccess = canAccessView(newView, accessRole, hasClientSelected);

    if (!canAccess) {
      if (newView !== "clients") toast.error("Selecione um cliente para acessar esta funcionalidade.");
      setView("clients");
    } else {
      setView(newView);
    }
  }, [effectiveClientId, accessRole, setView, closeMobileSidebar]);

  // Redirect to clients if current view becomes inaccessible (e.g. client deselected)
  useEffect(() => {
    if (!authLoading && session) {
      const canAccess = canAccessView(view, accessRole, effectiveClientId !== null);
      if (!canAccess) setView("clients");
    }
  }, [authLoading, session, effectiveClientId, accessRole, view, setView]);

  const selectedClient = effectiveClientId
    ? clients.find((c) => c.id === effectiveClientId) ?? null
    : null;

  // --- Early returns (auth gates) ---

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <LoginView onSignIn={signIn} error={authError} />;
  }

  if (!hasClients) {
    return (
      <OnboardingView
        userName={member?.name ?? user?.email}
        onSignOut={signOut}
        onClientsFound={refreshProfile}
      />
    );
  }

  // --- Main layout ---

  return (
    <div className="flex flex-col h-screen bg-background text-foreground font-sans">
      <Toaster richColors position="bottom-right" />

      <AppHeader
        onToggleMobileSidebar={openMobileSidebar}
        notifications={notifications}
        unreadCount={unreadCount}
        onMarkNotificationAsRead={markNotificationAsRead}
        onMarkAllNotificationsAsRead={markAllNotificationsAsRead}
        onNotificationClick={handleNotificationClick}
        reloadNotifications={reloadNotifications}
        selectedClientId={effectiveClientId ?? null}
        darkMode={darkMode}
        onToggleDark={toggleDark}
      />

      <div className="flex flex-row flex-1 overflow-hidden">
        <AppSidebar
          open={sidebarOpen}
          onToggle={toggleSidebar}
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={closeMobileSidebar}
          view={view}
          onViewChange={handleViewChange}
          hasClient={hasClients}
          role={accessRole}
          darkMode={darkMode}
          onToggleDark={toggleDark}
          userEmail={user?.email}
          userAvatarUrl={member?.avatar_url}
          onSignOut={signOut}
          selectedClient={selectedClient ?? null}
          availableClients={clients}
          onSelectClient={selectClient}
          isAdmin={isAdmin}
        />

        <main
          key={view}
          className={cn(
            "flex-1 overflow-auto animate-blur-fade-in",
            view === "home" ? "p-0" : "px-4 sm:px-6 lg:px-8 py-8"
          )}
        >
          <TooltipProvider>
            <AppRouter
              view={view}
              hasClients={hasClients}
              effectiveClientId={effectiveClientId}
              selectedClient={selectedClient}
              userName={member?.name ?? ""}
              userEmail={user?.email}
              holidays={holidays}
              onViewChange={handleViewChange}
              onEditTask={openEditTask}
              onOpenNewTask={openNewTask}
              onDeleteTask={requestDeleteTask}
              onUpdateTask={updateTask}
            />
          </TooltipProvider>
        </main>
      </div>

      {isModalOpen && (
        <TaskModal
          task={editingTask}
          members={members}
          onClose={closeTaskModal}
          onDelete={(id) => requestDeleteTask(id, true)}
          onSave={saveTask}
          holidays={holidays}
        />
      )}

      {transitionTarget && (
        <ClientTransitionOverlay
          clientName={transitionTarget.name}
          onComplete={onTransitionComplete}
        />
      )}

      {pendingDeleteTaskId && (
        <ConfirmModal
          title="Eliminar demanda"
          message="Tem a certeza que deseja eliminar esta demanda?"
          confirmLabel="Eliminar demanda"
          cancelLabel="Cancelar"
          onConfirm={confirmDeleteTask}
          onCancel={cancelDeleteTask}
        />
      )}
    </div>
  );
}
