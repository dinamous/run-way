import { useState, useEffect } from "react";
import TaskModal from "./components/TaskModal";
import DashboardView from "./views/DashboardView";
import MembersView from "./views/MembersView";
import ReportsView from "./views/ReportsView";
import LoginPage from "./pages/LoginPage";
import { CalendarDays, LogOut, Sun, Moon } from "lucide-react";
import { Button } from "./components/ui";
import { cn } from "./lib/utils";
import { useAuth } from "./hooks/useAuth";
import { useSupabase } from "./hooks/useSupabase";
import { Toaster, toast } from "sonner";

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

  const [view, setView] = useState<"dashboard" | "members" | "reports">("dashboard");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any | null>(null);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <LoginPage onSignIn={signIn} error={authError} />;
  }

  const handleDelete = async (id: string) => {
    if (confirm("Tem a certeza que deseja eliminar esta tarefa?")) {
      const ok = await deleteTask(id);
      if (!ok) toast.error("Erro ao eliminar tarefa");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <Toaster richColors position="top-right" />
      <header className="bg-card border-b border-border sticky top-0 z-10 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary p-2 rounded-lg">
              <CalendarDays className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold text-foreground">
              Calendário de Demandas
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setDarkMode((d) => !d)}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Alternar tema"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="hidden sm:inline">{user?.email}</span>
              <Button variant="ghost" size="sm" onClick={signOut}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>

            <div className="h-6 w-px bg-border" />

            <div className="flex bg-muted rounded-lg p-1">
              {(["dashboard", "members", "reports"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={cn(
                    "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                    view === v
                      ? "bg-card shadow-sm text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {v === "dashboard" ? "Calendário" : v === "members" ? "Membros" : "Relatórios"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {view === "dashboard" ? (
          <DashboardView
            tasks={tasks}
            members={members}
            onEdit={(t: unknown) => { setEditingTask(t); setIsModalOpen(true); }}
            onDelete={handleDelete}
            onUpdateTask={updateTask}
            onOpenNew={() => { setEditingTask(null); setIsModalOpen(true); }}
            onExport={() => window.print()}
            isConnected={true}
          />
        ) : view === "members" ? (
          <MembersView tasks={tasks} members={members} />
        ) : (
          <ReportsView tasks={tasks} members={members} />
        )}
      </main>

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
          onSave={async (taskData: any) => {
            let ok: boolean;
            if (editingTask) {
              ok = await updateTask(taskData);
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
