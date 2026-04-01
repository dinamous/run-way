import React from 'react';
import { cn } from '@/lib/utils';

interface RiskBadgeProps {
  risk: 'ok' | 'risco' | 'atrasado' | 'concluido';
}

const map = {
  ok:        { label: 'No prazo',  cls: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' },
  risco:     { label: 'Em risco',  cls: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100' },
  atrasado:  { label: 'Atrasado',  cls: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100' },
  concluido: { label: 'Concluido', cls: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' },
};

const RiskBadge: React.FC<RiskBadgeProps> = ({ risk }) => {
  const m = map[risk];
  return <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', m.cls)}>{m.label}</span>;
};

export default RiskBadge;
