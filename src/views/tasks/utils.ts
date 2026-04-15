export function formatDueDate(isoDate: string | undefined): { label: string; className: string } | null {
  if (!isoDate) return null;
  const due = new Date(isoDate.length === 10 ? isoDate + 'T00:00:00' : isoDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0)
    return { label: `Atrasada ${Math.abs(diffDays)}d`, className: 'text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950/50 dark:border-red-800' };
  if (diffDays === 0)
    return { label: 'Vence hoje', className: 'text-yellow-600 bg-yellow-50 border-yellow-200 dark:text-yellow-400 dark:bg-yellow-950/50 dark:border-yellow-800' };
  if (diffDays === 1)
    return { label: 'Vence amanhã', className: 'text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950/50 dark:border-blue-800' };
  return { label: `Em ${diffDays} dias`, className: 'text-muted-foreground bg-muted/50 border-border' };
}
