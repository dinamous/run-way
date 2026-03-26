import { useState } from 'react';
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';
import TaskModal from './components/TaskModal';
import DashboardView from './views/DashboardView';
import MembersView from './views/MembersView';
import { CalendarDays, RefreshCw, CheckCircle2, AlertCircle, LogIn } from 'lucide-react';
import { useGoogleDrive } from './hooks/useGoogleDrive';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;

const DEFAULT_MEMBERS = [
  { id: '1', name: 'Adryel', role: 'Designer', avatar: 'AD' },
  { id: '2', name: 'Matheus', role: 'Developer', avatar: 'MT' },
];

function AppInner() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [members] = useState(DEFAULT_MEMBERS);
  const [view, setView] = useState<'dashboard' | 'members'>('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any | null>(null);

  const { token, syncStatus, login, load, save } = useGoogleDrive();

  const googleLogin = useGoogleLogin({
    scope: 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/userinfo.email',
    onSuccess: async (res) => {
      login(res.access_token);
      const data = await load(res.access_token) as { tasks?: unknown[] } | null;
      if (data?.tasks) {
        setTasks(data.tasks);
      }
    },
  });

  const handleSave = async (newTasks: any[]) => {
    setTasks(newTasks);
    if (token) {
      await save({ tasks: newTasks, members, lastSync: new Date().toISOString() });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem a certeza que deseja eliminar esta tarefa?')) {
      handleSave(tasks.filter((t: { id: string }) => t.id !== id));
    }
  };

  const handleUpdateTask = (updatedTask: any) => {
    handleSave(tasks.map((t: { id: string }) => t.id === updatedTask.id ? updatedTask : t));
  };

  const syncLabel =
    syncStatus === 'syncing' ? 'A sincronizar...' :
    syncStatus === 'success' ? 'Sincronizado com Drive' :
    syncStatus === 'error' ? 'Erro ao sincronizar' : '';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <CalendarDays className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Capacity Dashboard</h1>
          </div>

          <div className="flex items-center gap-4">
            {token ? (
              <div className="flex items-center gap-2 text-sm">
                {syncStatus === 'syncing' && <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />}
                {syncStatus === 'success' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                {syncStatus === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
                <span className="hidden sm:inline-block text-slate-500">{syncLabel}</span>
              </div>
            ) : (
              <button
                onClick={() => googleLogin()}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <LogIn className="w-4 h-4" />
                Conectar Drive
              </button>
            )}

            <div className="h-6 w-px bg-slate-200"></div>

            <div className="flex bg-slate-100 rounded-lg p-1">
              <button onClick={() => setView('dashboard')} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${view === 'dashboard' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-600 hover:text-slate-900'}`}>Calendário</button>
              <button onClick={() => setView('members')} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${view === 'members' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-600 hover:text-slate-900'}`}>Membros</button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {view === 'dashboard' ? (
          <DashboardView tasks={tasks} members={members} onEdit={(t: unknown) => { setEditingTask(t); setIsModalOpen(true); }} onDelete={handleDelete} onUpdateTask={handleUpdateTask} onOpenNew={() => { setEditingTask(null); setIsModalOpen(true); }} onExport={() => window.print()} />
        ) : (
          <MembersView tasks={tasks} members={members} />
        )}
      </main>

      {isModalOpen && (
        <TaskModal task={editingTask} members={members} onClose={() => setIsModalOpen(false)} onSave={(taskData: { id: string }) => {
          const newTasks = editingTask
            ? tasks.map((t: { id: string }) => t.id === taskData.id ? taskData : t)
            : [...tasks, { ...taskData, id: crypto.randomUUID(), createdAt: new Date().toISOString() }];
          handleSave(newTasks);
          setIsModalOpen(false);
        }} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <GoogleOAuthProvider clientId={CLIENT_ID}>
      <AppInner />
    </GoogleOAuthProvider>
  );
}
