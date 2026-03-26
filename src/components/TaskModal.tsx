import React, { useState } from 'react';
import { cascadePhases } from '../utils/dateUtils';
import { Input, Label, Button } from './ui';
import { AlertCircle, Save } from 'lucide-react';

const TaskModal: React.FC<any> = ({ task, members, onClose, onSave }) => {
  const [formData, setFormData] = useState<any>({
    title: task?.title || '',
    clickupLink: task?.clickupLink || '',
    assignee: task?.assignee || '',
    status: task?.status || 'backlog',
    isManual: task?.isManual || false,
    phases: task?.phases || cascadePhases(new Date())
  });

  const [errors, setErrors] = useState<any>({});

  const validate = () => {
    const newErrors:any = {};
    if (!formData.title || formData.title.length < 3) newErrors.title = "Título é obrigatório (mín. 3 caracteres).";
    if (formData.clickupLink && !formData.clickupLink.startsWith('http')) newErrors.clickupLink = "Insira um link válido do ClickUp.";
    if (!formData.assignee) newErrors.assignee = "Selecione um responsável.";
    ['design','approval','dev','qa'].forEach(phase => {
      if (formData.phases[phase].end < formData.phases[phase].start) newErrors[`${phase}End`] = "O fim deve ser igual ou posterior ao início.";
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: any) => {
    e.preventDefault();
    if (validate()) onSave({ ...task, ...formData });
  };

  const handlePhaseChange = (phase: string, field: string, value: string) => {
    const newPhases = { ...formData.phases, [phase]: { ...formData.phases[phase], [field]: value } };
    if (!formData.isManual && phase === 'design' && field === 'start') {
      const cascaded = cascadePhases(new Date(value));
      setFormData((prev:any) => ({ ...prev, phases: cascaded }));
      return;
    }
    setFormData((prev:any) => ({ ...prev, phases: newPhases }));
  };

  const resetToAuto = () => {
    const cascaded = cascadePhases(new Date(formData.phases.design.start));
    setFormData((prev:any) => ({ ...prev, isManual: false, phases: cascaded }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-800">{task ? 'Editar Demanda' : 'Nova Demanda'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          <form id="task-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider border-b pb-2">Informações Gerais</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="title">Título da Demanda</Label>
                  <Input id="title" value={formData.title} onChange={e=>setFormData((p:any)=>({...p,title:e.target.value}))} placeholder="Ex: Landing Page Black Friday" />
                  {errors.title && <p className="text-xs text-red-500">{errors.title}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clickup">Link do ClickUp (Opcional)</Label>
                  <Input id="clickup" type="url" value={formData.clickupLink} onChange={e=>setFormData((p:any)=>({...p,clickupLink:e.target.value}))} placeholder="https://app.clickup.com/t/..." />
                  {errors.clickupLink && <p className="text-xs text-red-500">{errors.clickupLink}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assignee">Designer Responsável</Label>
                  <select id="assignee" value={formData.assignee} onChange={e=>setFormData((p:any)=>({...p,assignee:e.target.value}))} className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">
                    <option value="">Selecione...</option>
                    {members.filter((m:any)=>m.role==='Designer').map((m:any)=> (<option key={m.id} value={m.id}>{m.name}</option>))}
                  </select>
                  {errors.assignee && <p className="text-xs text-red-500">{errors.assignee}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Estado</Label>
                  <select id="status" value={formData.status} onChange={e=>setFormData((p:any)=>({...p,status:e.target.value}))} className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">
                    <option value="backlog">Backlog</option>
                    <option value="em andamento">Em Andamento</option>
                    <option value="bloqueado">Bloqueado</option>
                    <option value="concluído">Concluído</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <div className="flex justify-between items-center border-b pb-2">
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Janelas de Entrega (Fases)</h3>
                <div className="flex items-center gap-2">
                  <Label htmlFor="manual-mode" className="text-xs text-slate-500 cursor-pointer">Modo Manual</Label>
                  <button type="button" role="switch" aria-checked={formData.isManual} onClick={()=>{ if(formData.isManual) resetToAuto(); else setFormData((p:any)=>({...p,isManual:true})); }} className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-transparent transition-colors ${formData.isManual ? 'bg-blue-600' : 'bg-slate-200'}`}>
                    <span className={`pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform ${formData.isManual ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>

              {!formData.isManual && (
                <div className="bg-blue-50 text-blue-800 text-xs p-3 rounded-md flex items-start gap-2 border border-blue-100">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>Modo cascata ativado. Altere a data de início do <strong>Design</strong> e as fases seguintes serão calculadas automaticamente (ignorando fins de semana).</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { id: 'design', label: '1. Design', color: 'text-blue-700' },
                  { id: 'approval', label: '2. Aprovação', color: 'text-yellow-700' },
                  { id: 'dev', label: '3. Desenvolvimento', color: 'text-purple-700' },
                  { id: 'qa', label: '4. QA', color: 'text-green-700' }
                ].map((phase)=> (
                  <div key={phase.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                    <Label className={`font-semibold ${phase.color}`}>{phase.label}</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-500">Início</Label>
                        <Input type="date" value={formData.phases[phase.id].start} onChange={(e)=>handlePhaseChange(phase.id,'start',e.target.value)} disabled={!formData.isManual && phase.id !== 'design'} className={`h-8 text-xs ${!formData.isManual && phase.id !== 'design' ? 'bg-slate-100 cursor-not-allowed' : ''}`} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-500">Fim</Label>
                        <Input type="date" value={formData.phases[phase.id].end} onChange={(e)=>handlePhaseChange(phase.id,'end',e.target.value)} disabled={!formData.isManual} className={`h-8 text-xs ${!formData.isManual ? 'bg-slate-100 cursor-not-allowed' : ''}`} />
                      </div>
                    </div>
                    {errors[`${phase.id}End`] && <p className="text-[10px] text-red-500">{errors[`${phase.id}End`]}</p>}
                  </div>
                ))}
              </div>
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} type="button">Cancelar</Button>
          <Button type="submit" form="task-form"><Save className="w-4 h-4 mr-2" />{task ? 'Salvar Alterações' : 'Criar Demanda'}</Button>
        </div>
      </div>
    </div>
  );
};

export default TaskModal;
