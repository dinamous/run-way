import { useState, useEffect } from "react";
import TaskModal from "./components/TaskModal";
import { AppHeader } from "./components/AppHeader";
import { AppSidebar } from "./components/AppSidebar";
import { DashboardView } from "./views/dashboard";
import MembersView from "./views/MembersView";
import ReportsView from "./views/reports";
import { LoginView } from "./views/login";
import { useAuth } from "./hooks/useAuth";
import { useSupabase } from "./hooks/useSupabase";
import { Toaster, toast } from "sonner";
import type { Task } from "./lib/steps";

export default function App() {
  const { session, user, signIn, signOut, authError, loading: authLoading } = useAuth();
  const { tasks, members, createTask, updateTask, deleteTask } = useSupabase();

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

  const [view, setView] = useState<"dashboard" | "members" | "reports">("dashboard");
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
        onSignOut={signOut}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={handleToggleSidebar}
      />

      <div className="flex flex-row flex-1 overflow-hidden">
        <AppSidebar
          open={sidebarOpen}
          onToggle={handleToggleSidebar}
          view={view}
          onViewChange={setView}
        />

        <main className="flex-1 overflow-auto px-4 sm:px-6 lg:px-8 py-8">
          {view === "dashboard" ? (
            <DashboardView
              tasks={tasks}
              members={members}
              onEdit={(task: Task) => { setEditingTask(task); setIsModalOpen(true); }}
              onDelete={handleDelete}
              onUpdateTask={updateTask}
              onOpenNew={() => { setEditingTask(null); setIsModalOpen(true); }}
              onExport={() => window.print()}
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
        />
      )}
    </div>
  );
}
