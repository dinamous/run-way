export type Holiday = { date: string; name: string };

/** Returns true if the YYYY-MM-DD string falls on a Saturday, Sunday, or holiday. */
export function isWeekendOrHoliday(date: string, holidays: Holiday[]): boolean {
  const d = new Date(date + 'T00:00:00');
  const day = d.getDay();
  if (day === 0 || day === 6) return true;
  return holidays.some(h => h.date === date);
}

/** Returns the holiday name for a date, or undefined if not a holiday. */
export function getHolidayName(date: string, holidays: Holiday[]): string | undefined {
  return holidays.find(h => h.date === date)?.name;
}

/**
 * Returns the next date (inclusive of `date`) that is not a Saturday, Sunday, or holiday.
 * Advances day-by-day until a business day is found.
 */
export function nextNonHolidayBusinessDay(date: string, holidays: Holiday[]): string {
  let d = new Date(date + 'T00:00:00');
  while (isWeekendOrHoliday(toDateStr(d), holidays)) {
    d = new Date(d.getTime() + 86400000);
  }
  return toDateStr(d);
}

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}
