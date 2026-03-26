import { useEffect, useState } from 'react';
import { cascadePhases } from './utils/dateUtils';
import { MOCK_MEMBERS } from './data/mock';
import TaskModal from './components/TaskModal';
import DashboardView from './views/DashboardView';
import MembersView from './views/MembersView';
import { CalendarDays, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

export default function App() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [members] = useState(MOCK_MEMBERS);
  const [view, setView] = useState<'dashboard' | 'members'>('dashboard');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any | null>(null);

  useEffect(() => {
    const loadData = () => {
      setSyncStatus('syncing');
      try {
        const storedData = localStorage.getItem('capacity-drive-mock');
        if (storedData) {
          const parsed = JSON.parse(storedData);
          setTasks(parsed.tasks || []);
        } else {
          const dummyStart = new Date();
          const p = cascadePhases(dummyStart);
          setTasks([{
            id: '1',
            title: 'Landing Page Q3',
            clickupLink: 'https://clickup.com/t/123',
            assignee: '1',
            phases: p,
            status: 'em andamento',
            isManual: false
          }]);
        }
        setTimeout(() => setSyncStatus('success'), 800);
      } catch (err) {
        setSyncStatus('error');
      }
    };
    loadData();
  }, []);

  const saveDataToDrive = (newTasks: any[]) => {
    setSyncStatus('syncing');
    try {
      localStorage.setItem('capacity-drive-mock', JSON.stringify({ tasks: newTasks, members, lastSync: new Date().toISOString() }));
      setTasks(newTasks);
      setTimeout(() => setSyncStatus('success'), 600);
    } catch (e) {
      setSyncStatus('error');
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem a certeza que deseja eliminar esta tarefa?')) {
      saveDataToDrive(tasks.filter(t => t.id !== id));
    }
  };

  const handlePrint = () => window.print();

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
            <div className="flex items-center gap-2 text-sm">
              {syncStatus === 'syncing' && <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />}
              {syncStatus === 'success' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
              {syncStatus === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
              <span className="hidden sm:inline-block text-slate-500">
                {syncStatus === 'syncing' ? 'A sincronizar...' : syncStatus === 'success' ? 'Sincronizado (Drive Mock)' : syncStatus === 'error' ? 'Erro ao sincronizar' : ''}
              </span>
            </div>

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
          <DashboardView tasks={tasks} members={members} onEdit={(t:any)=>{setEditingTask(t); setIsModalOpen(true);}} onDelete={handleDelete} onOpenNew={()=>{setEditingTask(null); setIsModalOpen(true);}} onExport={handlePrint} />
        ) : (
          <MembersView tasks={tasks} members={members} />
        )}
      </main>

      {isModalOpen && (
        <TaskModal task={editingTask} members={members} onClose={()=>setIsModalOpen(false)} onSave={(taskData:any)=>{
          const newTasks = editingTask ? tasks.map(t=> t.id === taskData.id ? taskData : t) : [...tasks, { ...taskData, id: crypto.randomUUID(), createdAt: new Date().toISOString() }];
          saveDataToDrive(newTasks);
          setIsModalOpen(false);
        }} />
      )}
    </div>
  );
}
