import React from 'react';
import { BarChart } from 'lucide-react';
import TermTooltip from './TermTooltip';

interface ThroughputChartProps {
  throughput: Record<string, number>;
}

const ThroughputChart: React.FC<ThroughputChartProps> = ({ throughput }) => {
  const sortedEntries = Object.entries(throughput).sort(([a], [b]) => a.localeCompare(b));
  const maxValue = Math.max(...Object.values(throughput), 1);

  return (
    <section>
      <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
        <BarChart className="w-4 h-4 text-primary" /> Vazão (Throughput)
        <TermTooltip 
          term="Vazão" 
          definition="Quantidade de demandas concluídas por mês. Indica a capacidade real do time. Se a vazão média é 20 tasks/mês, planejar 40 para o próximo mês garante atraso." 
        />
      </h3>
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
        {sortedEntries.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Sem dados de vazão.</p>
        ) : (
          <div className="flex items-end gap-1 h-32">
            {sortedEntries.map(([week, count]) => {
              const pct = Math.round((count / maxValue) * 100);
              const [, month] = week.split('-');
              const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
              return (
                <div key={week} className="flex-1 flex flex-col items-center gap-1">
                  <div 
                    className="w-full bg-primary rounded-t-sm transition-all hover:bg-primary/80" 
                    style={{ height: `${pct}%`, minHeight: count > 0 ? '4px' : '0' }}
                    title={`${count} tasks`}
                  />
                  <span className="text-[10px] text-muted-foreground truncate w-full text-center">
                    {monthNames[parseInt(month, 10) - 1]}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
          <span className="font-medium">Total:</span> {Object.values(throughput).reduce((a, b) => a + b, 0)} tasks concluídas
        </div>
      </div>
    </section>
  );
};

export default ThroughputChart;