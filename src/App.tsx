import { useState, useEffect, useCallback } from "react";
import { useClientStore } from "@/store/useClientStore";
import { useUIStore } from "@/store/useUIStore";
import { useMemberStore } from "@/store/useMemberStore";
import TaskModal from "./components/TaskModal";
import { AppHeader } from "./components/AppHeader";
import { AppSidebar } from "./components/AppSidebar";
import { DashboardView } from "./views/dashboard";
import MembersView from "./views/MembersView";
import ReportsView from "./views/reports";
import { AdminView } from "./views/admin";
import { RequireAdmin } from "./components/RequireAdmin";
import { LoginView } from "./views/login";
import { OnboardingView } from "./views/onboarding";
import { UserClientsView } from "./views/user/UserClientsView";
import { NoClientView } from "./components/NoClientView";
import { HomeView } from "./views/home";
import { ToolsView } from "./views/tools";
import { useAuthContext } from "@/contexts/AuthContext";
import { useSupabase } from "./hooks/useSupabase";
import { useHolidays } from "./hooks/useHolidays";
import { useNotifications } from "./hooks/useNotifications";
import { resolveNotificationRoute } from "./lib/notifications";
import { Toaster, toast } from "sonner";
import type { Task } from "./lib/steps";
import type { Notification } from "./types/notification";
import type { ViewType } from "@/store/useUIStore";
import { canAccessView, resolveAccessRole } from "@/lib/accessControl";
import { ConfirmModal, TooltipProvider } from "@/components/ui";

export default function App() {
  const { session, user, signIn, signOut, authError, loading: authLoading, isAdmin, member, clients, refreshProfile } = useAuthContext();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const accessRole = resolveAccessRole(member);

  const hasClients = clients.length > 0;

  const { selectedClientId, setClient } = useClientStore();
  const { members } = useMemberStore();

  const effectiveClientId = selectedClientId === undefined
    ? (hasClients ? clients[0].id : null)
    : (isAdmin ? selectedClientId : (selectedClientId ?? (hasClients ? clients[0].id : null)));

  const handleSignOut = () => {
    setIsLoggingOut(true);
    signOut();
  };

  useEffect(() => {
    if (authLoading || !session) return;

    if (selectedClientId === undefined && hasClients) {
      setClient(clients[0].id);
    } else if (!hasClients) {
      setClient(undefined);
    } else if (typeof selectedClientId === 'string' && !clients.find(c => c.id === selectedClientId)) {
      setClient(clients[0]?.id ?? undefined);
    }
  }, [authLoading, session, hasClients, clients, selectedClientId, setClient]);

  const { createTask, updateTask, deleteTask } = useSupabase({
    memberId: member?.id,
    clientId: effectiveClientId,
    isAdmin,
  });

  const { holidays } = useHolidays();

  const {
    notifications,
    unreadCount,
    loading: notificationsLoading,
    markAsRead: markNotificationAsRead,
    markAllAsRead: markAllNotificationsAsRead,
    reload: reloadNotifications,
  } = useNotifications(member?.id, effectiveClientId)

  const view = useUIStore((s) => s.view)
  const setView = useUIStore((s) => s.setView)

  const handleNotificationClick = useCallback((notification: Notification) => {
    const route = resolveNotificationRoute(notification)
    if (route) {
      if (route.startsWith('/dashboard')) {
        setView('dashboard')
      } else if (route === '/profile') {
        // TODO: open profile
      } else if (route === '/clients') {
        setView('clients')
      }
    }
  }, [setView])

  const [darkMode, setDarkMode] = useState(() => {
    return (
      localStorage.getItem("theme") === "dark" ||
      (!localStorage.getItem("theme") &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)
    )
  })

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode)
    localStorage.setItem("theme", darkMode ? "dark" : "light")
  }, [darkMode])

  const [sidebarOpen, setSidebarOpen] = useState(() => {
    return localStorage.getItem("sidebarOpen") !== "false"
  })
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  const handleToggleSidebar = () => {
    setSidebarOpen((prev) => {
      localStorage.setItem("sidebarOpen", String(!prev))
      return !prev
    })
  }

  const isModalOpen = useUIStore((s) => s.isTaskModalOpen)
  const openTaskModal = useUIStore((s) => s.openTaskModal)
  const closeTaskModal = useUIStore((s) => s.closeTaskModal)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [pendingDeleteTaskId, setPendingDeleteTaskId] = useState<string | null>(null)
  const [closeTaskModalOnDelete, setCloseTaskModalOnDelete] = useState(false)

  const handleSelectClient = useCallback((clientId: string | null | undefined) => {
    setClient(clientId);
    setView("home");
  }, [setClient, setView]);

  const handleViewChange = useCallback((newView: ViewType) => {
    setMobileSidebarOpen(false);
    const hasClientSelected = effectiveClientId !== null;
    const canAccess = canAccessView(newView, accessRole, hasClientSelected);

    if (!canAccess) {
      if (newView !== "clients") {
        toast.error("Selecione um cliente para acessar esta funcionalidade.");
      }
      setView("clients");
    } else {
      setView(newView);
    }
  }, [effectiveClientId, accessRole, setView]);

  useEffect(() => {
    if (!authLoading && session) {
      const hasClientSelected = effectiveClientId !== null;
      const canAccess = canAccessView(view, accessRole, hasClientSelected);
      if (!canAccess) {
        setView("clients");
      }
    }
  }, [authLoading, session, effectiveClientId, accessRole, view, setView]);

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
        onSignOut={handleSignOut}
        onClientsFound={refreshProfile}
      />
    )
  }

  const requestDeleteTask = (id: string, closeModalAfterDelete = false) => {
    setPendingDeleteTaskId(id);
    setCloseTaskModalOnDelete(closeModalAfterDelete);
  };

  const handleConfirmDeleteTask = async () => {
    if (!pendingDeleteTaskId) return;

    const taskId = pendingDeleteTaskId;
    const shouldCloseModal = closeTaskModalOnDelete;

    setPendingDeleteTaskId(null);
    setCloseTaskModalOnDelete(false);

    const ok = await deleteTask(taskId);
    if (!ok) {
      toast.error("Erro ao eliminar tarefa");
      return;
    }

    if (shouldCloseModal) {
      closeTaskModal();
    }
  };

  const showNoClientView = !hasClients && view !== "clients";
  const showSelectClient = hasClients && !effectiveClientId && view !== "clients";
  const selectedClient = effectiveClientId ? clients.find(c => c.id === effectiveClientId) : null;

  return (
    <div className="flex flex-col h-screen bg-background text-foreground font-sans">
      <Toaster richColors position="bottom-right" />
      <AppHeader
        darkMode={darkMode}
        onToggleDark={() => setDarkMode((d) => !d)}
        userEmail={user?.email}
        userAvatarUrl={member?.avatar_url}
        onSignOut={handleSignOut}
        selectedClient={selectedClient ?? null}
        availableClients={clients}
        onSelectClient={handleSelectClient}
        isAdmin={isAdmin}
        onToggleMobileSidebar={() => setMobileSidebarOpen(true)}
        notifications={notifications}
        unreadCount={unreadCount}
        notificationsLoading={notificationsLoading}
        onMarkNotificationAsRead={markNotificationAsRead}
        onMarkAllNotificationsAsRead={markAllNotificationsAsRead}
        onNotificationClick={handleNotificationClick}
        reloadNotifications={reloadNotifications}
      />

      <div className={`flex flex-row flex-1 overflow-hidden transition-opacity duration-300 ${isLoggingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <AppSidebar
            open={sidebarOpen}
            onToggle={handleToggleSidebar}
            mobileOpen={mobileSidebarOpen}
            onCloseMobile={() => setMobileSidebarOpen(false)}
            view={view}
            onViewChange={handleViewChange}
            hasClient={hasClients}
            role={accessRole}
            darkMode={darkMode}
            onToggleDark={() => setDarkMode((d) => !d)}
            userEmail={user?.email}
            userAvatarUrl={member?.avatar_url}
            onSignOut={handleSignOut}
          />

        <main key={view} className="flex-1 overflow-auto px-4 sm:px-6 lg:px-8 py-8 animate-blur-fade-in">
          <TooltipProvider>
            {showNoClientView ? (
            <NoClientView hasClients={false} onGoToClients={() => setView("clients")} />
          ) : showSelectClient ? (
            <NoClientView hasClients={true} onGoToClients={() => setView("clients")} />
          ) : view === "home" ? (
            <HomeView
              userName={member?.name ?? user?.email ?? ""}
              clientName={selectedClient?.name}
              hasClient={!!effectiveClientId}
              onViewChange={handleViewChange}
            />
          ) : view === "admin" ? (
            <RequireAdmin>
              <AdminView />
            </RequireAdmin>
          ) : view === "clients" ? (
            <UserClientsView client={selectedClient ?? null} />
          ) : view === "dashboard" ? (
            <DashboardView
              onEdit={(task: Task) => { setEditingTask(task); openTaskModal(); }}
              onDelete={(id: string) => requestDeleteTask(id)}
              onUpdateTask={updateTask}
              onOpenNew={() => { setEditingTask(null); openTaskModal(); }}
              onExport={() => window.print()}
              holidays={holidays}
            />
          ) : view === "members" ? (
            <MembersView />
          ) : view === "tools" ? (
            <ToolsView />
          ) : (
            <ReportsView />
            )}
          </TooltipProvider>
        </main>
      </div>

      {isModalOpen && (
        <TaskModal
          task={editingTask}
          members={members}
          onClose={closeTaskModal}
          onDelete={async (id: string) => {
            requestDeleteTask(id, true);
          }}
          onSave={async (taskData) => {
            let ok: boolean;
            if (editingTask) {
              ok = await updateTask({
                ...editingTask,
                ...taskData,
                clientId: effectiveClientId ?? editingTask.clientId,
              });
            } else {
              ok = await createTask({
                title: taskData.title,
                clickupLink: taskData.clickupLink,
                clientId: effectiveClientId ?? undefined,
                status: taskData.status,
                steps: taskData.steps,
              });
            }
            if (!ok) { toast.error("Erro ao guardar tarefa"); return; }
            closeTaskModal();
          }}
          holidays={holidays}
        />
      )}

      {pendingDeleteTaskId && (
        <ConfirmModal
          title="Eliminar demanda"
          message="Tem a certeza que deseja eliminar esta demanda?"
          confirmLabel="Eliminar demanda"
          cancelLabel="Cancelar"
          onConfirm={handleConfirmDeleteTask}
          onCancel={() => {
            setPendingDeleteTaskId(null);
            setCloseTaskModalOnDelete(false);
          }}
        />
      )}
    </div>
  );
}
