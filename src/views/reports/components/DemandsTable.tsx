import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDateToBR } from '@/lib/utils';
import { STEP_META } from '@/lib/steps';
import type { StepType } from '@/lib/steps';
import type { Member } from '@/hooks/useSupabase';
import type { EnrichedTask } from '../utils';
import RiskBadge from './RiskBadge';

interface DemandsTableProps {
  enriched: EnrichedTask[];
  members: Member[];
}

const DemandsTable: React.FC<DemandsTableProps> = ({ enriched }) => (
  <section>
    <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
      <TrendingUp className="w-4 h-4 text-primary" /> Status por Demanda
    </h3>
    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Demanda</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Membros</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Step atual</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Progresso</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Entrega</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Dias úteis</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Risco</th>
            </tr>
          </thead>
          <tbody>
            {enriched.map((t, i) => {
              const stepMeta = t.currentStep ? STEP_META[t.currentStep.type as StepType] : null;
              return (
                <tr key={t.id} className={cn('border-b border-border last:border-0 hover:bg-muted/30 transition-colors', i % 2 === 0 ? '' : 'bg-muted/10')}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {t.isBlocked && <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                      <div className="font-medium text-foreground max-w-[200px] truncate" title={t.title}>
                        {t.clickupLink
                          ? <a href={t.clickupLink} target="_blank" rel="noopener noreferrer" className="hover:underline text-primary">{t.title}</a>
                          : t.title}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center -space-x-1">
                      {t.taskMembers.length === 0
                        ? <span className="text-xs text-muted-foreground">—</span>
                        : t.taskMembers.map((m: Member) => (
                          <div key={m.id} className="w-6 h-6 rounded-full bg-muted border border-border flex items-center justify-center text-[10px] font-bold text-muted-foreground" title={m.name}>
                            {m.avatar}
                          </div>
                        ))
                      }
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {t.isBlocked ? (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200">
                        Bloqueado
                      </span>
                    ) : stepMeta ? (
                      <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1 w-fit', stepMeta.color)}>
                        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', stepMeta.dot)} />
                        {stepMeta.label}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Sem steps</span>
                    )}
                  </td>
                  <td className="px-4 py-3 min-w-[120px]">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all', t.risk === 'atrasado' ? 'bg-red-500' : t.risk === 'risco' ? 'bg-yellow-500' : 'bg-green-500')}
                          style={{ width: `${t.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-8 text-right">{t.progress}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {t.lastDeadline ? formatDateToBR(t.lastDeadline) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {!t.lastDeadline ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : t.bizLeft > 0 ? (
                      <span className={cn('text-xs font-medium', t.bizLeft <= 3 ? 'text-red-600 dark:text-red-400' : t.bizLeft <= 7 ? 'text-yellow-600 dark:text-yellow-400' : 'text-foreground')}>
                        {t.bizLeft}d uteis
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-red-600 dark:text-red-400">Vencido</span>
                    )}
                  </td>
                  <td className="px-4 py-3"><RiskBadge risk={t.risk} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  </section>
);

export default DemandsTable;
