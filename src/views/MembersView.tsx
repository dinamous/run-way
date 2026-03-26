import React from 'react';
import Badge from '../components/ui/Badge';

const MembersView: React.FC<any> = ({ tasks, members }) => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Capacity da Equipa</h2>
        <p className="text-muted-foreground">Visão geral de alocação de tarefas ativas por membro.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {members.map((member:any)=>{
          const memberTasks = tasks.filter((t:any)=>t.assignee === member.id);
          const activeTasks = memberTasks.length;
          let statusColor = "bg-green-500"; let statusText = "Capacidade Livre";
          if (activeTasks > 3) { statusColor = "bg-red-500"; statusText = "Sobrecarregado"; }
          else if (activeTasks > 0) { statusColor = "bg-blue-500"; statusText = "Alocado"; }

          return (
            <div key={member.id} className="bg-card p-5 rounded-xl border border-border shadow-sm flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-muted border border-border flex items-center justify-center text-lg font-bold text-muted-foreground">{member.avatar}</div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-foreground">{member.name}</h3>
                    <p className="text-xs text-muted-foreground">{member.role}</p>
                  </div>
                  <Badge variant="default" className={statusColor + " text-white border-transparent"}>{statusText}</Badge>
                </div>
                <div className="mt-4">
                  <div className="text-sm font-medium text-foreground mb-2">Demandas Atuais ({activeTasks})</div>
                  {activeTasks === 0 ? (
                     <p className="text-xs text-muted-foreground italic">Nenhuma demanda alocada.</p>
                  ) : (
                    <ul className="space-y-2">
                      {memberTasks.map((t:any)=> (
                        <li key={t.id} className="text-xs flex items-center gap-2 p-2 bg-muted/50 rounded-md border border-border"><div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div><span className="font-medium truncate flex-1">{t.title}</span><span className="text-muted-foreground">{t.status}</span></li>
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
