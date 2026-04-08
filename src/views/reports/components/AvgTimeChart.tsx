import React from 'react';
import { Clock } from 'lucide-react';
import { STEP_META } from '@/lib/steps';
import type { StepType } from '@/lib/steps';
import { cn } from '@/lib/utils';
import TermTooltip from './TermTooltip';

interface AvgTimeData {
  avgDays: number;
  byStep: Record<StepType, number>;
}

interface AvgTimeChartProps {
  avgTimeData: AvgTimeData;
}

const AvgTimeChart: React.FC<AvgTimeChartProps> = ({ avgTimeData }) => {
  const stepTypes = Object.keys(avgTimeData.byStep) as StepType[];
  const maxDays = Math.max(...Object.values(avgTimeData.byStep), avgTimeData.avgDays, 1);

  return (
    <section>
      <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
        <Clock className="w-4 h-4 text-primary" /> Tempo Médio de Entrega
        <TermTooltip 
          term="Tempo Médio" 
          definition="Duração média das demandas por tipo de step. Útil para entender quais etapas take mais tempo e planejar melhor." 
        />
      </h3>
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border">
          <div className="text-center flex-1">
            <p className="text-2xl font-bold text-foreground">{avgTimeData.avgDays}</p>
            <p className="text-xs text-muted-foreground">dias média geral</p>
          </div>
        </div>
        
        {stepTypes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Sem dados de tempo.</p>
        ) : (
          <div className="space-y-3">
            {stepTypes.map(type => {
              const meta = STEP_META[type];
              const days = avgTimeData.byStep[type];
              const pct = maxDays > 0 ? Math.round((days / maxDays) * 100) : 0;
              return (
                <div key={type}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5 text-sm">
                      <span className={cn('w-2 h-2 rounded-full', meta.dot)} />
                      <span className="font-medium text-foreground">{meta.label}</span>
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums">{days} dias</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={cn('h-full rounded-full transition-all', meta.dot)} 
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

export default AvgTimeChart;