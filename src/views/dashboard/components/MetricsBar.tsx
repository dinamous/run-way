interface MetricsBarProps {
  totalCount: number;
  activeCount: number;
  blockedCount: number;
}

export function MetricsBar({ totalCount, activeCount, blockedCount }: MetricsBarProps) {
  if (totalCount === 0) return null;

  const metrics = [
    { label: 'Total', value: totalCount, cls: 'text-foreground', bg: 'bg-card border border-border' },
    { label: 'Em andamento', value: activeCount, cls: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 border border-blue-200 dark:bg-blue-950 dark:border-blue-800' },
    { label: 'Bloqueadas', value: blockedCount, cls: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 border border-red-200 dark:bg-red-950 dark:border-red-800' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 print:hidden">
      {metrics.map(({ label, value, cls, bg }) => (
        <div key={label} className={`rounded-xl px-4 py-3 flex flex-col gap-0.5 ${bg}`}>
          <span className="text-xs text-muted-foreground font-medium">{label}</span>
          <span className={`text-2xl font-bold tabular-nums ${cls}`}>{value}</span>
        </div>
      ))}
    </div>
  );
}
