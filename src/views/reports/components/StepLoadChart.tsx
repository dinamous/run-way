import React from 'react';
import { BarChart2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { STEP_TYPES_ORDER, STEP_META } from '@/lib/steps';
import type { StepType } from '@/lib/steps';
import TermTooltip from './TermTooltip';

interface StepLoadChartProps {
  stepLoad: Partial<Record<StepType, number>>;
  maxStepLoad: number;
}

const StepLoadChart: React.FC<StepLoadChartProps> = ({ stepLoad, maxStepLoad }) => (
  <section>
    <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
      <BarChart2 className="w-4 h-4 text-primary" /> Carga por Step (agora)
      <TermTooltip 
        term="Carga por Step" 
        definition="Quantidade de tasks com steps ativos agora, agrupadas por tipo de step. Identifica gargalos no momento." 
      />
    </h3>
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-3">
      {STEP_TYPES_ORDER.map(type => {
        const meta = STEP_META[type];
        const count = stepLoad[type] ?? 0;
        const pct = maxStepLoad > 0 ? Math.round((count / maxStepLoad) * 100) : 0;
        return (
          <div key={type}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5 text-sm">
                <span className={cn('w-2 h-2 rounded-full', meta.dot)} />
                <span className="font-medium text-foreground">{meta.label}</span>
              </div>
              <span className="text-xs text-muted-foreground tabular-nums">{count}</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className={cn('h-full rounded-full transition-all', meta.dot)} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
      {Object.values(stepLoad).every(v => v === 0) && (
        <p className="text-sm text-muted-foreground text-center py-2">Nenhum step ativo agora.</p>
      )}
    </div>
  </section>
);

export default StepLoadChart;
