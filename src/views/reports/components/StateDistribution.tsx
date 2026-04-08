import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import TermTooltip from './TermTooltip';

interface StateDistributionProps {
  total: number;
  bloqueadas: number;
  active: number;
  semSteps: number;
  concluidas: number;
}

const StateDistribution: React.FC<StateDistributionProps> = ({ total, bloqueadas, active, semSteps, concluidas }) => {
  const rows = [
    { key: 'concluido', label: 'Concluídas',   count: concluidas, color: 'bg-emerald-500', tooltip: 'Tasks marcadas como concluídas' },
    { key: 'andamento', label: 'Em andamento', count: active,     color: 'bg-blue-500',    tooltip: 'Tasks com step ativo no período atual' },
    { key: 'bloqueado', label: 'Bloqueado',    count: bloqueadas, color: 'bg-red-500',     tooltip: 'Tasks com bloqueio ativo' },
    { key: 'sem-steps', label: 'Sem steps',    count: semSteps,   color: 'bg-muted-foreground', tooltip: 'Tasks sem steps definidos' },
  ];

  return (
    <section>
      <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4 text-primary" /> Distribuição por Estado
        <TermTooltip 
          term="Estado" 
          definition="Classificação atual das demandas: bloqueadas, em andamento (com step ativo) ou sem steps definidos." 
        />
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
