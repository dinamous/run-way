import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui';

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
      tooltip: `Percentual de demandas bloqueadas em relação ao total.\nAbaixo de 15% = fluxo saudável, 15-29% = estável, 30%+ = atenção.`,
      cls: blockedRate >= 30 ? 'text-red-600 dark:text-red-400' : blockedRate >= 15 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-card border border-border',
    },
    {
      label: 'Demandas visíveis',
      value: visibleCount,
      helper: `${totalCount} no cliente`,
      tooltip: `Demandas atribuídas a clientes ativos. ${visibleCount} de ${totalCount} demandas visíveis.`,
      cls: 'text-foreground',
      bg: 'bg-card border border-border',
    },
    {
      label: 'Em andamento',
      value: activeCount,
      helper: `${activeRate}% da base`,
      tooltip: `Demandas em execução. ${activeCount} tarefas ativas representando ${activeRate}% do total.`,
      cls: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 border border-blue-200 dark:bg-blue-950 dark:border-blue-800',
    },
    {
      label: 'Bloqueadas',
      value: blockedCount,
      helper: `${blockedRate}% da base`,
      tooltip: `Demandas pausadas por impedimentos. ${blockedCount} bloqueadas (${blockedRate}% do total).`,
      cls: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-50 border border-red-200 dark:bg-red-950 dark:border-red-800',
    },
  ];

  return (
    <TooltipProvider>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 print:hidden">
        {metrics.map(({ label, value, helper, tooltip, cls, bg }) => (
          <Tooltip key={label}>
            <TooltipTrigger asChild>
              <div className={`rounded-xl px-4 py-3 flex flex-col gap-0.5 ${bg} cursor-help`}>
                <span className="text-xs text-muted-foreground font-medium">{label}</span>
                <span className={`text-2xl font-bold tabular-nums ${cls}`}>{value}</span>
                <span className="text-[11px] text-muted-foreground">{helper}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="whitespace-pre-line">{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
