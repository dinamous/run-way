import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { STEP_META } from '@/lib/steps';
import type { StepType } from '@/lib/steps';
import { cn } from '@/lib/utils';

interface BottleneckData {
  type: StepType;
  avgDuration: number;
  totalTasks: number;
  delays: number;
}

interface ProcessBottlenecksProps {
  bottlenecksData: BottleneckData[];
  p85ByStep?: Record<StepType, number>;
}

const ProcessBottlenecks: React.FC<ProcessBottlenecksProps> = ({ bottlenecksData, p85ByStep }) => {
  const maxDuration = Math.max(...bottlenecksData.map(b => b.avgDuration), 1);
  
  return (
    <section>
      <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-primary" /> Análise de Processos (duração média)
      </h3>
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
        {bottlenecksData.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Sem dados de processos.</p>
        ) : (
          <div className="space-y-4">
            {bottlenecksData.map(b => {
              const meta = STEP_META[b.type];
              const pct = maxDuration > 0 ? Math.round((b.avgDuration / maxDuration) * 100) : 0;
              const p85 = p85ByStep?.[b.type] ?? 0;
              const isLong = p85 > 0 ? b.avgDuration > p85 : b.avgDuration > 7;
              
              return (
                <div key={b.type} className="flex items-center gap-4">
                  <div className="w-24 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <span className={cn('w-2 h-2 rounded-full', meta.dot)} />
                      <span className="text-sm font-medium text-foreground truncate">{meta.label}</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={cn('h-full rounded-full transition-all', isLong ? 'bg-amber-500' : meta.dot)} 
                        style={{ width: `${pct}%` }} 
                      />
                    </div>
                  </div>
                  <div className="w-16 text-right shrink-0">
                    <span className="text-sm font-semibold text-foreground tabular-nums">{b.avgDuration}d</span>
                  </div>
                  <div className="w-16 text-right shrink-0">
                    <span className="text-xs text-muted-foreground tabular-nums">{b.totalTasks} tasks</span>
                  </div>
                  {p85 > 0 && (
                    <div className="w-12 text-right shrink-0">
                      <span className="text-xs text-muted-foreground">P85: {p85}d</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default ProcessBottlenecks;