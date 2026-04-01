import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StateDistributionProps {
  total: number;
  bloqueadas: number;
  active: number;
  semSteps: number;
}

const StateDistribution: React.FC<StateDistributionProps> = ({ total, bloqueadas, active, semSteps }) => {
  const rows = [
    { key: 'bloqueado', label: 'Bloqueado',    count: bloqueadas, color: 'bg-red-500'          },
    { key: 'andamento', label: 'Em andamento', count: active,     color: 'bg-blue-500'         },
    { key: 'sem-steps', label: 'Sem steps',    count: semSteps,   color: 'bg-muted-foreground' },
  ];

  return (
    <section>
      <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4 text-primary" /> Distribuicao por Estado
      </h3>
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-3">
        {rows.map(({ key, label, count, color }) => {
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div key={key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-foreground">{label}</span>
                <span className="text-xs text-muted-foreground tabular-nums">{count} ({pct}%)</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default StateDistribution;
