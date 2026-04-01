import React, { useState, useMemo } from 'react';
import { Button } from '../components/ui';
import { Plus, Download, CalendarDays, AlignLeft, X } from 'lucide-react';
import { STEP_TYPES_ORDER, STEP_META, type StepType } from '../lib/steps';
import { normaliseTask, todayStr } from '../utils/dashboardUtils';
import { getCurrentStep } from '../lib/steps';
import { CalendarView } from './calendar';
import TimelineView from './TimelineView';
import type { DashboardViewProps } from '../types/props';

const DashboardView: React.FC<DashboardViewProps> = ({ tasks, members, onEdit, onDelete, onUpdateTask, onOpenNew, onExport }) => {
  const [calView, setCalView] = useState<'calendar' | 'timeline'>('calendar');
  const [filterAssignee, setFilterAssignee] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSteps, setFilterSteps] = useState<StepType[]>([]);
  const hasActiveFilters = filterAssignee || filterStatus || filterSteps.length > 0;

  const clearFilters = () => { setFilterAssignee(''); setFilterStatus(''); setFilterSteps([]); };

  const toggleStepFilter = (type: StepType) => {
    setFilterSteps(prev => prev.includes(type) ? prev.filter(s => s !== type) : [...prev, type]);
  };

  const filteredTasks = useMemo(() => {
    return tasks
      .filter(task => {
        if (filterStatus) {
          const norm = normaliseTask(task);
          if (filterStatus === 'bloqueado' && !norm.status?.blocked) return false;
          if (filterStatus === 'nao-bloqueado' && norm.status?.blocked) return false;
        }
        if (filterAssignee) {
          const norm = normaliseTask(task);
          const anyStepHas = norm.steps.some(s => s.assignees.includes(filterAssignee));
          if (!anyStepHas) return false;
        }
        if (filterSteps.length > 0) {
          const norm = normaliseTask(task);
          const activeTypes = norm.steps.filter(s => s.active).map(s => s.type);
          if (!filterSteps.some(ft => activeTypes.includes(ft))) return false;
        }
        return true;
      })
      .map(task => {
        const norm = normaliseTask(task);
        let steps = norm.steps;
        if (filterSteps.length > 0) {
          steps = steps.filter(s => filterSteps.includes(s.type));
        }
        if (filterAssignee) {
          steps = steps.filter(s => s.assignees.includes(filterAssignee));
        }
        return { ...norm, steps };
      });
  }, [tasks, filterAssignee, filterStatus, filterSteps]);

  const blockedCount = useMemo(() => tasks.filter(t => normaliseTask(t).status?.blocked).length, [tasks]);
  const activeCount  = useMemo(() => tasks.filter(t => {
    const norm = normaliseTask(t);
    const today = todayStr();
    const step = getCurrentStep(norm.steps ?? [], today);
    return step && step.start <= today && step.end >= today;
  }).length, [tasks]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Visão Geral</h2>
          <p className="text-muted-foreground text-sm">Gestão das entregas criativas e de desenvolvimento.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-muted rounded-lg p-1 gap-1">
            <button
              onClick={() => setCalView('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${calView === 'calendar' ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <CalendarDays className="w-3.5 h-3.5" /> Calendário
            </button>
            <button
              onClick={() => setCalView('timeline')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${calView === 'timeline' ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <AlignLeft className="w-3.5 h-3.5" /> Linha do Tempo
            </button>
          </div>
          <Button variant="outline" onClick={onExport}><Download className="w-4 h-4 mr-1.5" /> PDF</Button>
          <Button onClick={onOpenNew}><Plus className="w-4 h-4 mr-1.5" /> Nova Demanda</Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="px-3 py-2 rounded-xl border border-border bg-muted print:hidden">
        <div className="flex items-center gap-2 flex-wrap">
          <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)} className="text-xs rounded-lg border border-border bg-card px-2 py-1.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="">Responsável</option>
            {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="text-xs rounded-lg border border-border bg-card px-2 py-1.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="">Status</option>
            <option value="bloqueado">Bloqueado</option>
            <option value="nao-bloqueado">Não bloqueado</option>
          </select>
          <div className="w-px h-4 bg-border mx-0.5" />
          {STEP_TYPES_ORDER.map(type => {
            const meta = STEP_META[type];
            const active = filterSteps.includes(type);
            return (
              <button
                key={type}
                onClick={() => toggleStepFilter(type)}
                className={`px-2 py-1 rounded-full text-xs font-medium border transition-colors ${active ? meta.tagBg + ' border-transparent' : 'bg-card border-border text-muted-foreground hover:text-foreground'}`}
              >
                {meta.tag}
              </button>
            );
          })}
          {hasActiveFilters && (
            <>
              <span className="text-xs text-muted-foreground ml-auto">{filteredTasks.length}/{tasks.length}</span>
              <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors">
                <X className="w-3 h-3" /> Limpar
              </button>
            </>
          )}
        </div>
      </div>

      {/* Métricas */}
      {tasks.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 print:hidden">
          {[
            { label: 'Total',        value: tasks.length,  cls: 'text-foreground',                    bg: 'bg-card border border-border' },
            { label: 'Em andamento', value: activeCount,   cls: 'text-blue-600 dark:text-blue-400',   bg: 'bg-blue-50 border border-blue-200 dark:bg-blue-950 dark:border-blue-800' },
            { label: 'Bloqueadas',   value: blockedCount,  cls: 'text-red-600 dark:text-red-400',     bg: 'bg-red-50 border border-red-200 dark:bg-red-950 dark:border-red-800' },
          ].map(({ label, value, cls, bg }) => (
            <div key={label} className={`rounded-xl px-4 py-3 flex flex-col gap-0.5 ${bg}`}>
              <span className="text-xs text-muted-foreground font-medium">{label}</span>
              <span className={`text-2xl font-bold tabular-nums ${cls}`}>{value}</span>
            </div>
          ))}
        </div>
      )}


      {/* View */}
      {calView === 'calendar' ? (
        <CalendarView tasks={filteredTasks} members={members} onEdit={onEdit} onDelete={onDelete} onUpdateTask={onUpdateTask} />
      ) : (
        <TimelineView tasks={filteredTasks} members={members} onEdit={onEdit} onDelete={onDelete} onUpdateTask={onUpdateTask} />
      )}

      {/* Legend */}
      <div className="flex gap-4 flex-wrap text-xs text-muted-foreground print:hidden">
        {STEP_TYPES_ORDER.map(type => (
          <div key={type} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${STEP_META[type].dot}`} />
            {STEP_META[type].label}
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
          Bloqueado
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
