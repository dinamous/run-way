import React from 'react';
import { AlertTriangle, AlertCircle } from 'lucide-react';
import type { Member } from '@/hooks/useSupabase';
import type { EnrichedTask } from '../utils';

interface AlertsSectionProps {
  enriched: EnrichedTask[];
}

const AlertsSection: React.FC<AlertsSectionProps> = ({ enriched }) => {
  const atrasadas = enriched.filter(t => t.risk === 'atrasado');
  const emRisco = enriched.filter(t => t.risk === 'risco');

  if (atrasadas.length === 0 && emRisco.length === 0) return null;

  return (
    <section>
      <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-yellow-500" /> Alertas
      </h3>
      <div className="space-y-2">
        {atrasadas.map(t => (
          <div key={t.id} className="flex items-center gap-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg px-4 py-2.5 text-sm">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span className="font-medium text-red-800 dark:text-red-200">{t.title}</span>
            <span className="text-red-600 dark:text-red-400 text-xs">— entrega era {t.lastDeadline}</span>
          </div>
        ))}
        {emRisco.map(t => (
          <div key={t.id} className="flex items-center gap-3 bg-yellow-50 dark:bg-yellow-950/40 border border-yellow-200 dark:border-yellow-900 rounded-lg px-4 py-2.5 text-sm">
            <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" />
            <span className="font-medium text-yellow-800 dark:text-yellow-200">{t.title}</span>
            <span className="text-yellow-600 dark:text-yellow-400 text-xs">
              — {t.isBlocked ? 'bloqueado' : `${t.bizLeft}d uteis restantes`}
              {t.taskMembers.length > 0 && ` · ${t.taskMembers.map((m: Member) => m.name).join(', ')}`}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
};

export default AlertsSection;
