import React from 'react';
import Badge from '../components/ui/Badge';

const MembersView: React.FC<any> = ({ tasks, members }) => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Capacity da Equipa</h2>
        <p className="text-slate-500">Visão geral de alocação de tarefas ativas por membro.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {members.map((member:any)=>{
          const memberTasks = tasks.filter((t:any)=>t.assignee === member.id);
          const activeTasks = memberTasks.length;
          let statusColor = "bg-green-500"; let statusText = "Capacidade Livre";
          if (activeTasks > 3) { statusColor = "bg-red-500"; statusText = "Sobrecarregado"; }
          else if (activeTasks > 0) { statusColor = "bg-blue-500"; statusText = "Alocado"; }

          return (
            <div key={member.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-lg font-bold text-slate-600">{member.avatar}</div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-slate-900">{member.name}</h3>
                    <p className="text-xs text-slate-500">{member.role}</p>
                  </div>
                  <Badge variant="default" className={statusColor + " text-white border-transparent"}>{statusText}</Badge>
                </div>
                <div className="mt-4">
                  <div className="text-sm font-medium text-slate-700 mb-2">Demandas Atuais ({activeTasks})</div>
                  {activeTasks === 0 ? (
                     <p className="text-xs text-slate-400 italic">Nenhuma demanda alocada.</p>
                  ) : (
                    <ul className="space-y-2">
                      {memberTasks.map((t:any)=> (
                        <li key={t.id} className="text-xs flex items-center gap-2 p-2 bg-slate-50 rounded-md border border-slate-100"><div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div><span className="font-medium truncate flex-1">{t.title}</span><span className="text-slate-400">{t.status}</span></li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MembersView;
