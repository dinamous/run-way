import React from 'react';
import { Button } from '../components/ui';
import { formatDate } from '../utils/dateUtils';
import { Download, Plus, Edit2, Trash2 } from 'lucide-react';

const DashboardView: React.FC<any> = ({ tasks, members, onEdit, onDelete, onOpenNew, onExport }) => {
  const today = new Date();
  today.setHours(0,0,0,0);
  const timelineDays = Array.from({ length: 30 }).map((_, i) => { const d = new Date(today); d.setDate(d.getDate() + i); return d; });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end print:hidden">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Visão Geral</h2>
          <p className="text-slate-500">Faça a gestão das entregas criativas e de desenvolvimento.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onExport}><Download className="w-4 h-4 mr-2" /> Exportar (PDF)</Button>
          <Button onClick={onOpenNew}><Plus className="w-4 h-4 mr-2" /> Nova Demanda</Button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <div style={{ minWidth: '800px' }}>
            <div className="flex border-b border-slate-200 bg-slate-50">
              <div className="w-64 flex-shrink-0 p-4 font-medium text-sm text-slate-500 border-r border-slate-200">Demanda</div>
              <div className="flex-1 flex">
                {timelineDays.map((date,i)=> (
                  <div key={i} className={`flex-1 min-w-[30px] border-r border-slate-100 p-2 text-center text-xs ${date.getDay()===0 || date.getDay()===6 ? 'bg-slate-100/50':''}`}>
                    <div className="font-semibold text-slate-700">{date.getDate()}</div>
                    <div className="text-slate-400 text-[10px]">{['D','S','T','Q','Q','S','S'][date.getDay()]}</div>
                  </div>
                ))}
              </div>
            </div>

            {tasks.length === 0 ? (
              <div className="p-8 text-center text-slate-500">Nenhuma demanda registada. Clique em "Nova Demanda" para começar.</div>
            ) : (
              tasks.map((task:any)=>{
                const assignee = members.find((m:any)=>m.id===task.assignee);

                const renderPhaseBlock = (phaseObj:any, colorClass:string, label:string) => {
                  if(!phaseObj?.start || !phaseObj?.end) return null;
                  const startD = new Date(phaseObj.start); startD.setHours(0,0,0,0);
                  const endD = new Date(phaseObj.end); endD.setHours(0,0,0,0);
                  const tStart = timelineDays[0]; const tEnd = timelineDays[timelineDays.length-1];
                  if (endD < tStart || startD > tEnd) return null;
                  const getDayIndex = (d:Date) => Math.floor((d.getTime() - tStart.getTime()) / (1000*60*60*24));
                  let startIndex = getDayIndex(startD); let endIndex = getDayIndex(endD);
                  if (startIndex < 0) startIndex = 0; if (endIndex >= timelineDays.length) endIndex = timelineDays.length-1;
                  const totalDays = timelineDays.length; const left = (startIndex/totalDays)*100; const width = ((endIndex - startIndex + 1)/totalDays)*100;
                  return (
                    <div className={`absolute top-2 bottom-2 rounded-md ${colorClass} shadow-sm border opacity-90 hover:opacity-100 cursor-pointer flex items-center px-2 overflow-hidden group`} style={{ left: `${left}%`, width: `${width}%` }} title={`${label}: ${formatDate(startD)} a ${formatDate(endD)}`}>
                      <span className="text-[10px] font-bold truncate opacity-0 group-hover:opacity-100 transition-opacity">{label}</span>
                    </div>
                  );
                };

                return (
                  <div key={task.id} className="flex border-b border-slate-100 hover:bg-slate-50 transition-colors group">
                    <div className="w-64 flex-shrink-0 p-4 border-r border-slate-200 flex flex-col justify-center relative">
                      <div className="font-medium text-sm text-slate-900 truncate pr-8">{task.title}</div>
                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">{assignee ? (<span className="flex items-center gap-1"><div className="w-4 h-4 rounded-full bg-slate-200 text-[8px] flex items-center justify-center font-bold text-slate-600">{assignee.avatar}</div>{assignee.name}</span>) : 'Sem responsável'}</div>
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 flex gap-1 print:hidden transition-opacity">
                        <button onClick={()=>onEdit(task)} className="p-1.5 text-slate-400 hover:text-blue-600 rounded-md hover:bg-blue-50"><Edit2 className="w-3.5 h-3.5" /></button>
                        <button onClick={()=>onDelete(task.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                    <div className="flex-1 relative border-b border-transparent">
                      <div className="absolute inset-0 flex pointer-events-none">{timelineDays.map((date,i)=>(<div key={i} className={`flex-1 border-r border-slate-100/50 ${date.getDay()===0||date.getDay()===6? 'bg-slate-100/30':''}`} />))}</div>
                      {renderPhaseBlock(task.phases.design, 'bg-blue-100 border-blue-200 text-blue-800', 'Design')}
                      {renderPhaseBlock(task.phases.approval, 'bg-yellow-100 border-yellow-200 text-yellow-800', 'Aprovação')}
                      {renderPhaseBlock(task.phases.dev, 'bg-purple-100 border-purple-200 text-purple-800', 'Dev')}
                      {renderPhaseBlock(task.phases.qa, 'bg-green-100 border-green-200 text-green-800', 'QA')}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-4 flex-wrap text-sm text-slate-600 print:hidden">
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-blue-400"></div> Design (5 dias)</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-yellow-400"></div> Aprovação (3 dias)</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-purple-400"></div> Dev (7 dias)</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-green-400"></div> QA (3 dias)</div>
      </div>
    </div>
  );
};

export default DashboardView;
