import { useMemo } from 'react';

export function useTimelineDays(daysRange: number) {
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const days = useMemo(() => Array.from({ length: daysRange }).map((_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    return d;
  }), [today, daysRange]);

  return { days, today };
}
