import { useState, useMemo } from 'react';

export function useCalendarNavigation() {
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const [monthDate, setMonthDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));

  const weeks = useMemo(() => {
    const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const lastDay = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
    const startDow = firstDay.getDay();
    const gridStart = new Date(firstDay);
    gridStart.setDate(gridStart.getDate() - startDow);
    const result: Date[][] = [];
    const cur = new Date(gridStart);
    while (true) {
      const week: Date[] = [];
      for (let i = 0; i < 7; i++) { week.push(new Date(cur)); cur.setDate(cur.getDate() + 1); }
      result.push(week);
      if (cur > lastDay && result.length >= 4) break;
    }
    return result;
  }, [monthDate]);

  const prevMonth = () => setMonthDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setMonthDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  const goToday = () => setMonthDate(new Date(today.getFullYear(), today.getMonth(), 1));

  return { today, monthDate, weeks, prevMonth, nextMonth, goToday };
}
