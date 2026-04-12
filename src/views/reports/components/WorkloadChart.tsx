import React from 'react';
import { TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import TermTooltip from './TermTooltip';

interface WorkloadData {
  memberId: string;
  memberName: string;
  avatar: string;
  role: string;
  totalDays: number;
  taskCount: number;
  avgDaysPerTask: number;
}

interface WorkloadChartProps {
  workloadData: WorkloadData[];
}

const WorkloadChart: React.FC<WorkloadChartProps> = ({ workloadData }) => {
  const maxDays = Math.max(...workloadData.map(d => d.totalDays), 1);

  return (
    <section>
      <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-primary" /> Carga de Trabalho (dias alocados)
        <TermTooltip 
          term="Carga de Trabalho" 
          definition="Soma dos dias de todos os steps atribuídos a cada membro. Mais de 30 dias indica possível sobrecarga." 
        />
      </h3>
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
        {workloadData.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Sem dados de carga.</p>
        ) : (
          <div className="space-y-4">
            {workloadData.map(d => {
              const pct = maxDays > 0 ? Math.round((d.totalDays / maxDays) * 100) : 0;
              const isOverloaded = d.totalDays > 30;
              return (
                <div key={d.memberId}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-muted border border-border flex items-center justify-center text-xs font-bold text-muted-foreground">
                        {d.avatar}
                      </div>
                      <span className="text-sm font-medium text-foreground">{d.memberName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="tabular-nums">{d.totalDays}d</span>
                      <span className="text-muted-foreground/60">({d.taskCount} tasks)</span>
                    </div>
                  </div>
                  <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={cn('h-full rounded-full transition-all', isOverloaded ? 'bg-red-500' : 'bg-primary')} 
                      style={{ width: `${pct}%` }} 
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default WorkloadChart;