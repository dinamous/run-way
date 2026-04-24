import { useState, useEffect } from 'react';
import type { Holiday } from '@/utils/holidayUtils';
import { isWeekendOrHoliday, getHolidayName } from '@/utils/holidayUtils';

type HolidayCache = {
  fetchedAt: string;
  holidays: Holiday[];
};

const CACHE_DAYS = 30;

function getCached(year: number): Holiday[] | null {
  try {
    const raw = localStorage.getItem(`holidays:${year}`);
    if (!raw) return null;
    const cache: HolidayCache = JSON.parse(raw);
    const fetchedAt = new Date(cache.fetchedAt + 'T00:00:00');
    const now = new Date();
    const diffDays = (now.getTime() - fetchedAt.getTime()) / 86400000;
    if (diffDays > CACHE_DAYS) return null;
    return cache.holidays;
  } catch {
    return null;
  }
}

function setCache(year: number, holidays: Holiday[]) {
  const today = new Date().toISOString().split('T')[0];
  localStorage.setItem(`holidays:${year}`, JSON.stringify({ fetchedAt: today, holidays }));
}

async function fetchYear(year: number): Promise<Holiday[]> {
  const res = await fetch(`https://brasilapi.com.br/api/feriados/v1/${year}`);
  if (!res.ok) throw new Error(`BrasilAPI error: ${res.status}`);
  const data: { date: string; name: string }[] = await res.json();
  return data.map(h => ({ date: h.date, name: h.name }));
}

export function useHolidays() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;

    async function load() {
      setLoading(true);
      const results: Holiday[] = [];

      for (const year of [currentYear, nextYear]) {
        const cached = getCached(year);
        if (cached) {
          results.push(...cached);
        } else {
          try {
            const fetched = await fetchYear(year);
            setCache(year, fetched);
            results.push(...fetched);
          } catch {
            // silently ignore
          }
        }
      }

      setHolidays(results);
      setLoading(false);
    }

    load();
  }, []);

  return {
    holidays,
    loading,
    isHoliday: (date: string) => isWeekendOrHoliday(date, holidays),
    getHolidayName: (date: string) => getHolidayName(date, holidays),
  };
}
