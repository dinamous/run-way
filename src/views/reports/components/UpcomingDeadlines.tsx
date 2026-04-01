import React from 'react';
import { CalendarCheck, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EnrichedTask } from '../utils';

interface UpcomingDeadlinesProps {
  upcomingDeadlines: EnrichedTask[];
}

const UpcomingDeadlines: React.FC<UpcomingDeadlinesProps> = ({ upcomingDeadlines }) => (
  <section>
    <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
      <CalendarCheck className="w-4 h-4 text-primary" /> Proximas Entregas (14 dias)
    </h3>
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      {upcomingDeadlines.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground text-center">Nenhuma entrega nos proximos 14 dias.</p>
      ) : (
        <ul className="divide-y divide-border">
          {upcomingDeadlines.map(t => (
            <li key={t.id} className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-2 min-w-0">
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium text-foreground truncate">{t.title}</span>
                {t.taskMembers.length > 0 && (
                  <span className="text-xs text-muted-foreground shrink-0">{t.taskMembers[0].name}{t.taskMembers.length > 1 ? ` +${t.taskMembers.length - 1}` : ''}</span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-muted-foreground">{t.lastDeadline}</span>
                <span className={cn('text-xs font-semibold tabular-nums px-1.5 py-0.5 rounded',
                  t.daysLeft === 0 ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' :
                  t.daysLeft <= 3 ? 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300' :
                  'bg-muted text-muted-foreground')}>
                  {t.daysLeft === 0 ? 'Hoje' : `${t.daysLeft}d`}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  </section>
);

export default UpcomingDeadlines;
