interface MetricsBarProps {
  totalCount: number;
  visibleCount: number;
  activeCount: number;
  blockedCount: number;
}

export function MetricsBar({ totalCount, visibleCount, activeCount, blockedCount }: MetricsBarProps) {
  if (totalCount === 0) return null;

  const blockedRate = Math.round((blockedCount / totalCount) * 100);
  const activeRate = Math.round((activeCount / totalCount) * 100);
  const flowLabel = blockedRate >= 30 ? 'Atenção no fluxo' : blockedRate >= 15 ? 'Fluxo estável' : 'Fluxo saudável';

  const metrics = [
    {
      label: 'Saúde operacional',
      value: `${blockedRate}%`,
      helper: flowLabel,
      cls: blockedRate >= 30 ? 'text-red-600 dark:text-red-400' : blockedRate >= 15 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-card border border-border',
    },
    {
      label: 'Demandas visíveis',
      value: visibleCount,
      helper: `${totalCount} no cliente`,
      cls: 'text-foreground',
      bg: 'bg-card border border-border',
    },
    {
      label: 'Em andamento',
      value: activeCount,
      helper: `${activeRate}% da base`,
      cls: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 border border-blue-200 dark:bg-blue-950 dark:border-blue-800',
    },
    {
      label: 'Bloqueadas',
      value: blockedCount,
      helper: `${blockedRate}% da base`,
      cls: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-50 border border-red-200 dark:bg-red-950 dark:border-red-800',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 print:hidden">
        {metrics.map(({ label, value, helper, cls, bg }) => (
          <div key={label} className={`rounded-xl px-4 py-3 flex flex-col gap-0.5 ${bg}`}>
          <span className="text-xs text-muted-foreground font-medium">{label}</span>
          <span className={`text-2xl font-bold tabular-nums ${cls}`}>{value}</span>
          <span className="text-[11px] text-muted-foreground">{helper}</span>
          </div>
        ))}
    </div>
  );
}
