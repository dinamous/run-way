import React from 'react';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import TermTooltip from './TermTooltip';

interface TimelineData {
  month: string;
  completed: number;
  pending: number;
  total: number;
}

interface TimelineChartProps {
  timelineData: TimelineData[];
}

const TimelineChart: React.FC<TimelineChartProps> = ({ timelineData }) => {
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  const formatMonth = (monthKey: string) => {
    const [, m] = monthKey.split('-');
    return months[parseInt(m, 10) - 1] || monthKey;
  };

  return (
    <section>
      <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
        <Calendar className="w-4 h-4 text-primary" /> Timeline de Entregas por Mês
        <TermTooltip 
          term="Timeline" 
          definition="Distribuição de demandas por mês de prazo. Verde = concluídas, Amarelo = pendentes. Ajuda a visualizar a demanda futura." 
        />
      </h3>
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
        {timelineData.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Sem dados de timeline.</p>
        ) : (
          <div className="space-y-3">
            {timelineData.map(d => {
              const completedPct = d.total > 0 ? Math.round((d.completed / d.total) * 100) : 0;
              const pendingPct = d.total > 0 ? Math.round((d.pending / d.total) * 100) : 0;
              return (
                <div key={d.month} className="flex items-center gap-3">
                  <span className="text-sm font-medium text-foreground w-10 shrink-0">{formatMonth(d.month)}</span>
                  <div className="flex-1">
                    <div className="h-6 bg-muted rounded-md overflow-hidden flex">
                      {d.completed > 0 && (
                        <div 
                          className="h-full bg-green-500 rounded-l-md" 
                          style={{ width: `${completedPct}%` }}
                          title={`Concluídas: ${d.completed}`}
                        />
                      )}
                      {d.pending > 0 && (
                        <div 
                          className={cn('h-full', d.completed > 0 ? 'bg-amber-500' : 'bg-amber-500 rounded-l-md')}
                          style={{ width: `${pendingPct}%` }}
                          title={`Pendentes: ${d.pending}`}
                        />
                      )}
                      {d.total === 0 && <div className="h-full w-full bg-muted" />}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums w-12 text-right shrink-0">
                    {d.completed}/{d.total}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-green-500" />
            <span className="text-xs text-muted-foreground">Concluídas</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-amber-500" />
            <span className="text-xs text-muted-foreground">Pendentes</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TimelineChart;