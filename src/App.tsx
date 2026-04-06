import { useState, useEffect } from "react";
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
import { useUserClients } from "./views/user/hooks/useUserClients";
import { useAuthContext } from "@/contexts/AuthContext";
import { useSupabase } from "./hooks/useSupabase";
import { useHolidays } from "./hooks/useHolidays";
import { Toaster, toast } from "sonner";
import type { Task } from "./lib/steps";

export default function App() {
  const { session, user, signIn, signOut, authError, loading: authLoading, isAdmin, member, clients, impersonatedClientId } = useAuthContext();

  const hasMultipleClients = clients.length > 1;
  const hasOneClient = clients.length === 1;
  const defaultClientId = hasOneClient ? clients[0].id : null;

  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  useEffect(() => {
    if (hasOneClient && !selectedClientId) {
      setSelectedClientId(defaultClientId)
    } else if (!hasMultipleClients && !hasOneClient) {
      setSelectedClientId(null)
    }
  }, [hasOneClient, hasMultipleClients, defaultClientId, selectedClientId])

  const effectiveClientId = isAdmin ? impersonatedClientId : selectedClientId

  const { tasks, members, createTask, updateTask, deleteTask } = useSupabase({
    memberId: member?.id,
    clientId: effectiveClientId,
    isAdmin,
  });
  const { holidays } = useHolidays();
  const { userClients, availableClients, linkToClient, unlinkFromClient } = useUserClients();

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

  const [view, setView] = useState<"dashboard" | "members" | "reports" | "admin" | "clients">("dashboard");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

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
        selectedClient={selectedClientId ? clients.find(c => c.id === selectedClientId) : null}
      />

      <div className="flex flex-row flex-1 overflow-hidden">
        <AppSidebar
          open={sidebarOpen}
          onToggle={handleToggleSidebar}
          view={view}
          onViewChange={(v) => setView(v as typeof view)}
        />

        <main className="flex-1 overflow-auto px-4 sm:px-6 lg:px-8 py-8">
          {view === "admin" ? (
            <RequireAdmin>
              <AdminView />
            </RequireAdmin>
          ) : view === "clients" ? (
            <UserClientsView
              userClients={userClients}
              availableClients={availableClients}
              onLink={linkToClient}
              onUnlink={unlinkFromClient}
            />
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
            <MembersView tasks={tasks} members={members} />
          ) : (
            <ReportsView tasks={tasks} members={members} />
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
