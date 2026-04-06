import { useState, useEffect, useCallback, useMemo } from "react";
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
import { useUserClients } from "./views/user/hooks/useUserClients";
import { useAuthContext } from "@/contexts/AuthContext";
import { useSupabase } from "./hooks/useSupabase";
import { useHolidays } from "./hooks/useHolidays";
import { Toaster, toast } from "sonner";
import type { Task } from "./lib/steps";
import type { ViewType } from "./components/AppSidebar";

function canAccessFeature(
  view: ViewType,
  hasClient: boolean,
  isAdmin: boolean
): boolean {
  if (view === "admin" && !isAdmin) return false;
  if (view === "admin") return true;
  if (view === "clients") return true;
  if (!hasClient) return false;
  return true;
}

export default function App() {
  const { session, user, signIn, signOut, authError, loading: authLoading, isAdmin, member } = useAuthContext();

  const { userClients, availableClients } = useUserClients();

  const hasClients = userClients.length > 0;
  const clientOptions = isAdmin ? availableClients : userClients;
  
  // undefined = não inicializado (usa primeiro cliente por padrão)
  // null = admin selecionou "Todos os clientes"
  // string = cliente específico selecionado
  const [selectedClientId, setSelectedClientId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (!authLoading && session) {
      if (selectedClientId === undefined && hasClients) {
        // Inicialização: seleciona o primeiro cliente disponível
        setSelectedClientId(userClients[0].id);
      } else if (!hasClients) {
        // Usuário perdeu acesso a todos os clientes
        setSelectedClientId(undefined);
      } else if (typeof selectedClientId === 'string' && !userClients.find(c => c.id === selectedClientId)) {
        // Cliente selecionado não está mais acessível
        setSelectedClientId(userClients[0]?.id ?? undefined);
      }
    }
  }, [authLoading, session, hasClients, userClients]);

  // null só é válido para admin (ver todos); não-admin sempre precisa de um cliente
  const effectiveClientId = selectedClientId === undefined
    ? (hasClients ? userClients[0].id : null)
    : (isAdmin ? selectedClientId : (selectedClientId ?? (hasClients ? userClients[0].id : null)));

  const { tasks, members, createTask, updateTask, deleteTask } = useSupabase({
    memberId: member?.id,
    clientId: effectiveClientId,
    isAdmin,
  });

  // Membros filtrados pelo cliente ativo: apenas quem tem steps atribuídos nas tarefas desse cliente.
  // Quando effectiveClientId=null (admin vê tudo), mostra todos os membros.
  const clientMembers = useMemo(() => {
    if (effectiveClientId === null) return members;
    const assignedIds = new Set<string>();
    tasks.forEach(t => t.steps.forEach(s => s.assignees.forEach(id => assignedIds.add(id))));
    return members.filter(m => assignedIds.has(m.id));
  }, [tasks, members, effectiveClientId]);
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

  const [view, setView] = useState<ViewType>("dashboard");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

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
  }, [effectiveClientId, isAdmin]);

  useEffect(() => {
    if (!authLoading && session) {
      const hasClientSelected = effectiveClientId !== null;
      const canAccess = canAccessFeature(view, hasClientSelected, isAdmin);
      if (!canAccess) {
        setView("clients");
      }
    }
  }, [authLoading, session, effectiveClientId, isAdmin, view]);

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
  const selectedClient = effectiveClientId ? clientOptions.find(c => c.id === effectiveClientId) : null;

  return (
    <div className="flex flex-col h-screen bg-background text-foreground font-sans">
      <Toaster richColors position="top-right" />
      <AppHeader
        darkMode={darkMode}
        onToggleDark={() => setDarkMode((d) => !d)}
        userEmail={user?.email}
        userAvatarUrl={member?.avatar_url}
        onSignOut={signOut}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={handleToggleSidebar}
        selectedClient={selectedClient}
        availableClients={clientOptions}
        onSelectClient={setSelectedClientId}
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

        <main className="flex-1 overflow-auto px-4 sm:px-6 lg:px-8 py-8">
          {showNoClientView ? (
            <NoClientView hasClients={false} onGoToClients={() => setView("clients")} />
          ) : showSelectClient ? (
            <NoClientView hasClients={true} onGoToClients={() => setView("clients")} />
          ) : view === "admin" ? (
            <RequireAdmin>
              <AdminView />
            </RequireAdmin>
          ) : view === "clients" ? (
            <UserClientsView client={selectedClient ?? null} />
          ) : view === "dashboard" ? (
            <DashboardView
              tasks={tasks}
              members={members}
              onEdit={(task: Task) => { setEditingTask(task); setIsModalOpen(true); }}
              onDelete={handleDelete}
              onUpdateTask={updateTask}
              onOpenNew={() => { setEditingTask(null); setIsModalOpen(true); }}
              onExport={() => window.print()}
              holidays={holidays}
            />
          ) : view === "members" ? (
            <MembersView tasks={tasks} members={clientMembers} />
          ) : (
            <ReportsView tasks={tasks} members={clientMembers} />
          )}
        </main>
      </div>

      {isModalOpen && (
        <TaskModal
          task={editingTask}
          members={members}
          onClose={() => setIsModalOpen(false)}
          onDelete={async (id: string) => {
            if (confirm("Tem a certeza que deseja eliminar esta demanda?")) {
              const ok = await deleteTask(id);
              if (!ok) { toast.error("Erro ao eliminar tarefa"); return; }
              setIsModalOpen(false);
            }
          }}
          onSave={async (taskData) => {
            let ok: boolean;
            if (editingTask) {
              ok = await updateTask({ ...editingTask, ...taskData });
            } else {
              ok = await createTask({
                title: taskData.title,
                clickupLink: taskData.clickupLink,
                status: taskData.status,
                steps: taskData.steps,
              });
            }
            if (!ok) { toast.error("Erro ao guardar tarefa"); return; }
            setIsModalOpen(false);
          }}
          holidays={holidays}
        />
      )}
    </div>
  );
}