import { useState, useEffect, useCallback } from "react";
import { useClientStore } from "@/store/useClientStore";
import { useUIStore } from "@/store/useUIStore";
import { useTaskStore } from "@/store/useTaskStore";
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
import { UserClientsView } from "./views/user/UserClientsView";
import { NoClientView } from "./components/NoClientView";
import { HomeView } from "./views/home";
import { useAuthContext } from "@/contexts/AuthContext";
import { useSupabase } from "./hooks/useSupabase";
import { useHolidays } from "./hooks/useHolidays";
import { Toaster, toast } from "sonner";
import type { Task } from "./lib/steps";
import type { ViewType } from "@/store/useUIStore";

function canAccessFeature(
  view: ViewType,
  hasClient: boolean,
  isAdmin: boolean
): boolean {
  if (view === "admin" && !isAdmin) return false;
  if (view === "admin") return true;
  if (view === "home") return true;
  if (view === "clients") return true;
  if (!hasClient) return false;
  return true;
}

export default function App() {
  const { session, user, signIn, signOut, authError, loading: authLoading, isAdmin, member, clients } = useAuthContext();

  const hasClients = clients.length > 0;

  const { selectedClientId, setClient } = useClientStore();
  const { members } = useMemberStore();

  const effectiveClientId = selectedClientId === undefined
    ? (hasClients ? clients[0].id : null)
    : (isAdmin ? selectedClientId : (selectedClientId ?? (hasClients ? clients[0].id : null)));

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

  const [darkMode, setDarkMode] = useState(() => {
    return (
      localStorage.getItem("theme") === "dark" ||
      (!localStorage.getItem("theme") &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)
    );
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const [sidebarOpen, setSidebarOpen] = useState(() => {
    return localStorage.getItem("sidebarOpen") !== "false";
  });

  const handleToggleSidebar = () => {
    setSidebarOpen((prev) => {
      localStorage.setItem("sidebarOpen", String(!prev));
      return !prev;
    });
  };

  const view = useUIStore((s) => s.view);
  const setView = useUIStore((s) => s.setView);
  const isModalOpen = useUIStore((s) => s.isTaskModalOpen);
  const openTaskModal = useUIStore((s) => s.openTaskModal);
  const closeTaskModal = useUIStore((s) => s.closeTaskModal);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const handleSelectClient = useCallback((clientId: string | null | undefined) => {
    useTaskStore.getState().invalidate();
    useMemberStore.getState().invalidate();
    setClient(clientId);
    setView("home");
  }, [setClient, setView]);

  const handleViewChange = useCallback((newView: ViewType) => {
    const hasClientSelected = effectiveClientId !== null;
    const canAccess = canAccessFeature(newView, hasClientSelected, isAdmin);

    if (!canAccess) {
      if (newView !== "clients") {
        toast.error("Selecione um cliente para acessar esta funcionalidade.");
      }
      setView("clients");
    } else {
      setView(newView);
    }
  }, [effectiveClientId, isAdmin, setView]);

  useEffect(() => {
    if (!authLoading && session) {
      const hasClientSelected = effectiveClientId !== null;
      const canAccess = canAccessFeature(view, hasClientSelected, isAdmin);
      if (!canAccess) {
        setView("clients");
      }
    }
  }, [authLoading, session, effectiveClientId, isAdmin, view, setView]);

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

  const handleDelete = async (id: string) => {
    if (confirm("Tem a certeza que deseja eliminar esta tarefa?")) {
      const ok = await deleteTask(id);
      if (!ok) toast.error("Erro ao eliminar tarefa");
    }
  };

  const showNoClientView = !hasClients && view !== "clients";
  const showSelectClient = hasClients && !effectiveClientId && view !== "clients";
  const selectedClient = effectiveClientId ? clients.find(c => c.id === effectiveClientId) : null;

  return (
    <div className="flex flex-col h-screen bg-background text-foreground font-sans">
      <Toaster richColors position="top-right" />
      <AppHeader
        darkMode={darkMode}
        onToggleDark={() => setDarkMode((d) => !d)}
        userEmail={user?.email}
        userAvatarUrl={member?.avatar_url}
        onSignOut={signOut}
        selectedClient={selectedClient ?? null}
        availableClients={clients}
        onSelectClient={handleSelectClient}
        isAdmin={isAdmin}
      />

      <div className="flex flex-row flex-1 overflow-hidden">
        <AppSidebar
          open={sidebarOpen}
          onToggle={handleToggleSidebar}
          view={view}
          onViewChange={handleViewChange}
          hasClient={hasClients}
        />

        <main key={view} className="flex-1 overflow-auto px-4 sm:px-6 lg:px-8 py-8 animate-blur-fade-in">
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
              onDelete={handleDelete}
              onUpdateTask={updateTask}
              onOpenNew={() => { setEditingTask(null); openTaskModal(); }}
              onExport={() => window.print()}
              holidays={holidays}
            />
          ) : view === "members" ? (
            <MembersView />
          ) : (
            <ReportsView />
          )}
        </main>
      </div>

      {isModalOpen && (
        <TaskModal
          task={editingTask}
          members={members}
          onClose={closeTaskModal}
          onDelete={async (id: string) => {
            if (confirm("Tem a certeza que deseja eliminar esta demanda?")) {
              const ok = await deleteTask(id);
              if (!ok) { toast.error("Erro ao eliminar tarefa"); return; }
              closeTaskModal();
            }
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
    </div>
  );
}
