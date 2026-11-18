/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface StudentExperience {
  years: number;
  months: number;
  days: number;
  isCappedAtSixYears: boolean;
  isFuture: boolean;
  registrationDate: string;
  maxHistoryEndDate: string;
  formattedSomali: string;
  formattedEnglish: string;
}

export function calculateSixYearExpiry(registrationDateStr?: string): string {
  const base =
    registrationDateStr && /^\d{4}-\d{2}-\d{2}$/.test(registrationDateStr)
      ? registrationDateStr
      : new Date().toISOString().substring(0, 10);
  const [y, m, d] = base.split('-').map(Number);
  const targetYear = (y || 2026) + 6;
  const safeDay = m === 2 && d === 29 ? 28 : d || 1;
  return `${targetYear}-${String(m || 1).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;
}

export function generateMachadStudentUsername(studentId: string): string {
  const clean = studentId.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-');
  return clean.startsWith('machad-') ? clean : `machad-${clean}`;
}

/**
 * Dynamically calculates student academic duration/experience from registrationDate
 * up to current date (or optional referenceDate), supporting a maximum academic
 * history display of 6 years without altering or resetting the original registrationDate.
 */
export function calculateStudentExperience(
  registrationDateStr?: string,
  referenceDate: Date = new Date()
): StudentExperience {
  const todayStr = `${referenceDate.getFullYear()}-${String(referenceDate.getMonth() + 1).padStart(2, '0')}-${String(referenceDate.getDate()).padStart(2, '0')}`;
  const regStr =
    registrationDateStr && /^\d{4}-\d{2}-\d{2}$/.test(registrationDateStr)
      ? registrationDateStr
      : todayStr;
  const maxHistoryEndDate = calculateSixYearExpiry(regStr);

  const [ry, rm, rd] = regStr.split('-').map(Number);
  const start = new Date(ry, (rm || 1) - 1, rd || 1);
  const end = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());

  if (end <= start) {
    return {
      years: 0,
      months: 0,
      days: 0,
      isCappedAtSixYears: false,
      isFuture: end < start,
      registrationDate: regStr,
      maxHistoryEndDate,
      formattedSomali: '0 Sano, 0 Bilood, 0 Maalmood',
      formattedEnglish: '0 Years, 0 Months, 0 Days',
    };
  }

  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();

  if (days < 0) {
    months -= 1;
    const prevMonthLastDay = new Date(end.getFullYear(), end.getMonth(), 0).getDate();
    days += prevMonthLastDay;
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  let isCappedAtSixYears = false;
  if (years > 6 || (years === 6 && (months > 0 || days > 0))) {
    years = 6;
    months = 0;
    days = 0;
    isCappedAtSixYears = true;
  }

  const formattedSomali = `${years} Sano, ${months} Bilood, ${days} Maalmood`;
  const formattedEnglish = `${years} ${years === 1 ? 'Year' : 'Years'}, ${months} ${months === 1 ? 'Month' : 'Months'}, ${days} ${days === 1 ? 'Day' : 'Days'}`;

  return {
    years,
    months,
    days,
    isCappedAtSixYears,
    isFuture: false,
    registrationDate: regStr,
    maxHistoryEndDate,
    formattedSomali,
    formattedEnglish,
  };
}
