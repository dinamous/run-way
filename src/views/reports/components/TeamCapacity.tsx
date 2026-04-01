import React from 'react';
import { Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MemberLoad } from '../utils';

interface TeamCapacityProps {
  memberLoad: MemberLoad[];
}

const TeamCapacity: React.FC<TeamCapacityProps> = ({ memberLoad }) => (
  <section>
    <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
      <Users className="w-4 h-4 text-primary" /> Capacidade da Equipe (steps ativos hoje)
    </h3>
    <div className="space-y-3">
      {memberLoad.map(m => (
        <div key={m.id} className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center text-xs font-bold text-muted-foreground">{m.avatar}</div>
              <div>
                <p className="text-sm font-semibold text-foreground">{m.name}</p>
                <p className="text-xs text-muted-foreground">{m.role}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={cn('w-2 h-2 rounded-full', m.capacityColor)} />
              <span className="text-xs font-medium text-foreground">{m.capacityLabel}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div className={cn('h-full rounded-full transition-all', m.capacityColor)} style={{ width: `${Math.min(100, (m.activeCount / 5) * 100)}%` }} />
            </div>
            <span className="text-xs text-muted-foreground tabular-nums">{m.activeCount} steps hoje</span>
          </div>
          <div className="flex gap-2 text-xs">
            {m.atrasadasCount > 0 && <span className="bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 px-2 py-0.5 rounded-full">{m.atrasadasCount} atrasada{m.atrasadasCount > 1 ? 's' : ''}</span>}
            {m.riscoCount > 0 && <span className="bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300 px-2 py-0.5 rounded-full">{m.riscoCount} em risco</span>}
            {m.atrasadasCount === 0 && m.riscoCount === 0 && m.activeCount > 0 && <span className="text-muted-foreground">Tudo no prazo</span>}
            {m.activeCount === 0 && <span className="text-muted-foreground">Disponivel</span>}
          </div>
        </div>
      ))}
    </div>
  </section>
);

export default TeamCapacity;
