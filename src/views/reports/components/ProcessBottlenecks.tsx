import React from 'react';
import { AlertTriangle, Clock, Users, TrendingUp } from 'lucide-react';
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

  const sortedData = [...bottlenecksData].sort((a, b) => b.avgDuration - a.avgDuration);

  return (
    <section>
      <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-primary" /> Análise de Processos
      </h3>
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        {bottlenecksData.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Sem dados de processos.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5" /> Processo
                    </div>
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                    <div className="flex items-center gap-1.5 justify-end">
                      <Clock className="w-3.5 h-3.5" /> Média
                    </div>
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                    <div className="flex items-center gap-1.5 justify-end">
                      <Users className="w-3.5 h-3.5" /> Tasks
                    </div>
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                    <div className="flex items-center gap-1.5 justify-end">
                      P85 Limite
                    </div>
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Distribuição</th>
                </tr>
              </thead>
              <tbody>
                {sortedData.map(b => {
                  const meta = STEP_META[b.type];
                  const pct = maxDuration > 0 ? Math.round((b.avgDuration / maxDuration) * 100) : 0;
                  const p85 = p85ByStep?.[b.type] ?? 0;
                  const exceedsP85 = p85 > 0 && b.avgDuration > p85;

                  return (
                    <tr
                      key={b.type}
                      className={cn(
                        'border-b border-border last:border-0 transition-colors',
                        exceedsP85 ? 'bg-amber-500/5' : 'hover:bg-muted/30'
                      )}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', meta.dot)} />
                          <span className="font-medium text-foreground">{meta.label}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={cn(
                          'font-semibold tabular-nums',
                          exceedsP85 ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'
                        )}>
                          {b.avgDuration}d
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-muted-foreground tabular-nums">{b.totalTasks}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {p85 > 0 ? (
                          <span className={cn(
                            'tabular-nums',
                            exceedsP85 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'
                          )}>
                            {p85}d
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 min-w-[100px]">
                            <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  'h-full rounded-full transition-all',
                                  exceedsP85 ? 'bg-amber-500' : meta.dot
                                )}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground w-10 shrink-0 text-right">
                            {pct}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
};

export default ProcessBottlenecks;