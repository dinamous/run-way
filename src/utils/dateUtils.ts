// --- UTILITÁRIOS DE DATAS ---

export const formatDate = (date: Date | string) => {
  const d = new Date(date);
  const month = '' + (d.getMonth() + 1);
  const day = '' + d.getDate();
  const year = d.getFullYear();
  return [year, month.padStart(2, '0'), day.padStart(2, '0')].join('-');
};

export const addBusinessDays = (startDate: Date | string, daysToAdd: number) => {
  const currentDate = new Date(startDate);
  let addedDays = 0;
  if (daysToAdd === 0) {
    while (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return formatDate(currentDate);
  }

  while (addedDays < daysToAdd - 1) {
    currentDate.setDate(currentDate.getDate() + 1);
    if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
      addedDays++;
    }
  }
  return formatDate(currentDate);
};

export const nextBusinessDay = (date: Date | string) => {
  const next = new Date(date);
  next.setDate(next.getDate() + 1);
  while (next.getDay() === 0 || next.getDay() === 6) {
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

export const cascadePhases = (startDesignDate: Date | string) => {
  const designStart = formatDate(startDesignDate);
  const designEnd = addBusinessDays(designStart, DEFAULT_DURATIONS.design);

  const approvalStart = nextBusinessDay(designEnd);
  const approvalEnd = addBusinessDays(approvalStart, DEFAULT_DURATIONS.approval);

  const devStart = nextBusinessDay(approvalEnd);
  const devEnd = addBusinessDays(devStart, DEFAULT_DURATIONS.dev);

  const qaStart = nextBusinessDay(devEnd);
  const qaEnd = addBusinessDays(qaStart, DEFAULT_DURATIONS.qa);

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
