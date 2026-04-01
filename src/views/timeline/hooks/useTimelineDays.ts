import { useState, useMemo } from 'react';

export function useTimelineDays() {
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const [daysRange, setDaysRange] = useState(60);
  const days = useMemo(() => Array.from({ length: daysRange }).map((_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    return d;
  }), [today, daysRange]);

  return { daysRange, setDaysRange, days, today };
}
