import React, { useState } from 'react';
import { cascadePhases, addBusinessDays, nextBusinessDay, businessDaysBetween } from '../utils/dateUtils';
import { Input, Label, Button } from './ui';
import { Save, Clock, Play, AlertTriangle, CheckCircle2, ExternalLink } from 'lucide-react';

const PHASES_ORDER = ['design', 'approval', 'dev', 'qa'] as const;
const PHASE_META = {
  design:   { label: 'Design',    color: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-700',     dot: 'bg-blue-500'    },
  approval: { label: 'Aprovação', color: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-700', dot: 'bg-amber-500'   },
  dev:      { label: 'Dev',       color: 'bg-violet-100 text-violet-800 border-violet-300 dark:bg-violet-950 dark:text-violet-200 dark:border-violet-700', dot: 'bg-violet-500' },
  qa:       { label: 'QA',        color: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-700', dot: 'bg-emerald-500' },
};

const STATUS_OPTIONS = [
  { value: 'backlog',      label: 'Backlog',      desc: 'Aguardando início',   icon: Clock,         cls: 'border-slate-300 text-slate-700 bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:bg-slate-800',        activeCls: 'border-slate-600 bg-slate-200 text-slate-900 ring-1 ring-slate-500 dark:border-slate-400 dark:bg-slate-700 dark:text-white'        },
  { value: 'em andamento', label: 'Em Andamento', desc: 'Em progresso',        icon: Play,          cls: 'border-blue-300 text-blue-700 bg-blue-50 dark:border-blue-700 dark:text-blue-200 dark:bg-blue-950',             activeCls: 'border-blue-600 bg-blue-100 text-blue-900 ring-1 ring-blue-500 dark:border-blue-500 dark:bg-blue-900 dark:text-blue-100'          },
  { value: 'bloqueado',    label: 'Bloqueado',    desc: 'Impedido de avançar', icon: AlertTriangle, cls: 'border-red-300 text-red-700 bg-red-50 dark:border-red-700 dark:text-red-200 dark:bg-red-950',                  activeCls: 'border-red-600 bg-red-100 text-red-900 ring-1 ring-red-500 dark:border-red-500 dark:bg-red-900 dark:text-red-100'              },
  { value: 'concluído',    label: 'Concluído',    desc: 'Entregue',            icon: CheckCircle2,  cls: 'border-green-300 text-green-700 bg-green-50 dark:border-green-700 dark:text-green-200 dark:bg-green-950',        activeCls: 'border-green-600 bg-green-100 text-green-900 ring-1 ring-green-500 dark:border-green-500 dark:bg-green-900 dark:text-green-100'    },
];

const TaskModal: React.FC<any> = ({ task, members, onClose, onSave }) => {
  const [formData, setFormData] = useState<any>({
    title: task?.title || '',
    clickupLink: task?.clickupLink || '',
    assignee: task?.assignee || '',
    status: task?.status || 'backlog',
    phases: task?.phases || cascadePhases(new Date()),
  });
  const [errors, setErrors] = useState<any>({});

  const validate = () => {
    const e: any = {};
    if (!formData.title || formData.title.length < 3) e.title = 'Título obrigatório (mín. 3 caracteres).';
    if (formData.clickupLink && !formData.clickupLink.startsWith('http')) e.clickupLink = 'Insira um link válido.';
    if (!formData.assignee) e.assignee = 'Selecione um responsável.';
    PHASES_ORDER.forEach(p => {
      if (formData.phases[p].end < formData.phases[p].start) e[`${p}End`] = 'Fim anterior ao início.';
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: any) => {
    e.preventDefault();
    if (validate()) onSave({ ...task, ...formData });
  };

  // Smart cascade: any change propagates forward keeping each phase's duration
  const handlePhaseChange = (phase: string, field: 'start' | 'end', value: string) => {
    const idx = PHASES_ORDER.indexOf(phase as any);
    let newPhases = { ...formData.phases };

    if (field === 'start') {
      const dur = businessDaysBetween(newPhases[phase].start, newPhases[phase].end);
      newPhases[phase] = { start: value, end: addBusinessDays(value, dur) };
    } else {
      newPhases[phase] = { ...newPhases[phase], end: value };
    }

    // Cascade all subsequent phases
    for (let i = idx + 1; i < PHASES_ORDER.length; i++) {
      const prev = PHASES_ORDER[i - 1];
      const curr = PHASES_ORDER[i];
      const dur = businessDaysBetween(newPhases[curr].start, newPhases[curr].end);
      const newStart = nextBusinessDay(newPhases[prev].end);
      newPhases[curr] = { start: newStart, end: addBusinessDays(newStart, dur) };
    }

    setFormData((p: any) => ({ ...p, phases: newPhases }));
  };

  const designers = members.filter((m: any) => m.role === 'Designer');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">{task ? 'Editar Demanda' : 'Nova Demanda'}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">✕</button>
        </div>

        <div className="px-6 py-5 overflow-y-auto flex-1 space-y-6 custom-scrollbar">
          <form id="task-form" onSubmit={handleSubmit}>
            <div className="space-y-6">

              {/* Título */}
              <div className="space-y-1.5">
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={e => setFormData((p: any) => ({ ...p, title: e.target.value }))}
                  placeholder="Ex: Landing Page Black Friday"
                />
                {errors.title && <p className="text-xs text-red-500">{errors.title}</p>}
              </div>

              {/* Link ClickUp */}
              <div className="space-y-1.5">
                <Label htmlFor="clickup" className="flex items-center gap-1">
                  Link ClickUp
                  <span className="text-muted-foreground font-normal text-xs">(opcional)</span>
                </Label>
                <div className="relative">
                  <Input
                    id="clickup"
                    type="url"
                    value={formData.clickupLink}
                    onChange={e => setFormData((p: any) => ({ ...p, clickupLink: e.target.value }))}
                    placeholder="https://app.clickup.com/t/..."
                    className="pr-9"
                  />
                  {formData.clickupLink && (
                    <a href={formData.clickupLink} target="_blank" rel="noreferrer" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 transition-colors">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
                {errors.clickupLink && <p className="text-xs text-red-500">{errors.clickupLink}</p>}
              </div>

              {/* Responsável */}
              <div className="space-y-2">
                <Label>Designer Responsável</Label>
                <div className="flex flex-wrap gap-2">
                  {designers.map((m: any) => {
                    const selected = formData.assignee === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setFormData((p: any) => ({ ...p, assignee: m.id }))}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border-2 text-sm font-medium transition-all ${
                          selected
                            ? 'border-blue-500 bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200'
                            : 'border-border bg-card text-muted-foreground hover:border-border/80'
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${selected ? 'bg-blue-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                          {m.avatar}
                        </div>
                        {m.name}
                      </button>
                    );
                  })}
                </div>
                {errors.assignee && <p className="text-xs text-red-500">{errors.assignee}</p>}
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label>Estado</Label>
                <div className="grid grid-cols-2 gap-2">
                  {STATUS_OPTIONS.map(opt => {
                    const Icon = opt.icon;
                    const selected = formData.status === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setFormData((p: any) => ({ ...p, status: opt.value }))}
                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all ${selected ? opt.activeCls : opt.cls}`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <div>
                          <div className="text-xs font-semibold leading-tight">{opt.label}</div>
                          <div className="text-[10px] opacity-70 leading-tight">{opt.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Fases */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Fases de Entrega</Label>
                  <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Datas se ajustam automaticamente</span>
                </div>
                <div className="space-y-2">
                  {PHASES_ORDER.map((phaseId, idx) => {
                    const meta = PHASE_META[phaseId];
                    const phase = formData.phases[phaseId];
                    const dur = businessDaysBetween(phase.start, phase.end);
                    const hasError = errors[`${phaseId}End`];
                    return (
                      <div key={phaseId} className={`rounded-xl border p-3 space-y-2.5 ${meta.color}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
                            <span className="text-xs font-semibold">{idx + 1}. {meta.label}</span>
                          </div>
                          <span className="text-[10px] opacity-60">{dur} dia{dur !== 1 ? 's' : ''} útil{dur !== 1 ? 'eis' : ''}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <span className="text-[10px] opacity-70">Início</span>
                            <Input
                              type="date"
                              value={phase.start}
                              onChange={e => handlePhaseChange(phaseId, 'start', e.target.value)}
                              className="h-8 text-xs bg-white/70 border-0 focus:ring-1"
                            />
                          </div>
                          <div className="space-y-1">
                            <span className="text-[10px] opacity-70">Fim</span>
                            <Input
                              type="date"
                              value={phase.end}
                              onChange={e => handlePhaseChange(phaseId, 'end', e.target.value)}
                              className="h-8 text-xs bg-white/70 border-0 focus:ring-1"
                            />
                          </div>
                        </div>
                        {hasError && <p className="text-[10px] text-red-600">{errors[`${phaseId}End`]}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted/50 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} type="button">Cancelar</Button>
          <Button type="submit" form="task-form">
            <Save className="w-4 h-4 mr-1.5" />
            {task ? 'Salvar Alterações' : 'Criar Demanda'}
          </Button>
        </div>

      </div>
    </div>
  );
};

export default TaskModal;
