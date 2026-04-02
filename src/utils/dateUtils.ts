// --- UTILITÁRIOS DE DATAS ---

import type { Holiday } from './holidayUtils';

export const formatDate = (date: Date | string) => {
  const d = new Date(date);
  const month = '' + (d.getMonth() + 1);
  const day = '' + d.getDate();
  const year = d.getFullYear();
  return [year, month.padStart(2, '0'), day.padStart(2, '0')].join('-');
};

function isNonBusinessDay(date: Date, holidays: Holiday[]): boolean {
  const day = date.getDay();
  if (day === 0 || day === 6) return true;
  const str = formatDate(date);
  return holidays.some(h => h.date === str);
}

export const addBusinessDays = (startDate: Date | string, daysToAdd: number, holidays: Holiday[] = []) => {
  const currentDate = new Date(startDate);
  let addedDays = 0;
  if (daysToAdd === 0) {
    while (isNonBusinessDay(currentDate, holidays)) {
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return formatDate(currentDate);
  }

  while (addedDays < daysToAdd - 1) {
    currentDate.setDate(currentDate.getDate() + 1);
    if (!isNonBusinessDay(currentDate, holidays)) {
      addedDays++;
    }
  }
  return formatDate(currentDate);
};

export const nextBusinessDay = (date: Date | string, holidays: Holiday[] = []) => {
  const next = new Date(date);
  next.setDate(next.getDate() + 1);
  while (isNonBusinessDay(next, holidays)) {
    next.setDate(next.getDate() + 1);
  }
  return formatDate(next);
};

export const DEFAULT_DURATIONS = {
  design: 5,
  approval: 3,
  dev: 7,
  qa: 3
};

export const cascadePhases = (startDesignDate: Date | string, holidays: Holiday[] = []) => {
  const designStart = formatDate(startDesignDate);
  const designEnd = addBusinessDays(designStart, DEFAULT_DURATIONS.design, holidays);

  const approvalStart = nextBusinessDay(designEnd, holidays);
  const approvalEnd = addBusinessDays(approvalStart, DEFAULT_DURATIONS.approval, holidays);

  const devStart = nextBusinessDay(approvalEnd, holidays);
  const devEnd = addBusinessDays(devStart, DEFAULT_DURATIONS.dev, holidays);

  const qaStart = nextBusinessDay(devEnd, holidays);
  const qaEnd = addBusinessDays(qaStart, DEFAULT_DURATIONS.qa, holidays);

  return {
    design: { start: designStart, end: designEnd },
    approval: { start: approvalStart, end: approvalEnd },
    dev: { start: devStart, end: devEnd },
    qa: { start: qaStart, end: qaEnd }
  };
};

export const businessDaysBetween = (start: string, end: string): number => {
  let count = 0;
  const current = new Date(start);
  const endDate = new Date(end);
  while (current <= endDate) {
    if (current.getDay() !== 0 && current.getDay() !== 6) count++;
    current.setDate(current.getDate() + 1);
  }
  return Math.max(count, 1);
};

export default {};
