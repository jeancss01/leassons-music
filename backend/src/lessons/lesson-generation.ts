import { Weekday } from '@prisma/client';

const TIME_ZONE = 'America/Sao_Paulo';
export const LESSON_GENERATION_HORIZON_MONTHS = 3;

const WEEKDAY_TO_UTC_DAY: Record<Weekday, number> = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
};

/** Local calendar date YYYY-MM-DD in America/Sao_Paulo. */
export function todaySaoPaulo(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** Add calendar months to a YYYY-MM-DD date (clamps day to month length). */
export function addCalendarMonths(dateIso: string, months: number): string {
  const [year, month, day] = dateIso.split('-').map(Number);
  const anchor = new Date(Date.UTC(year, month - 1 + months, 1));
  const targetYear = anchor.getUTCFullYear();
  const targetMonth = anchor.getUTCMonth();
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const clampedDay = Math.min(day, lastDay);
  return formatUtcYmd(targetYear, targetMonth + 1, clampedDay);
}

export function planningHorizonEnd(todayIso: string): string {
  return addCalendarMonths(todayIso, LESSON_GENERATION_HORIZON_MONTHS);
}

/**
 * Inclusive weekly occurrence dates for a weekday between rangeStart and rangeEnd.
 * Dates are calendar strings; arithmetic uses UTC midnight to avoid local TZ shifts.
 */
export function weeklyOccurrenceDates(
  weekday: Weekday,
  rangeStartIso: string,
  rangeEndIso: string,
): string[] {
  if (rangeStartIso > rangeEndIso) {
    return [];
  }

  const first = firstWeekdayOnOrAfter(rangeStartIso, weekday);
  if (first > rangeEndIso) {
    return [];
  }

  const dates: string[] = [];
  let cursor = first;
  while (cursor <= rangeEndIso) {
    dates.push(cursor);
    cursor = addDaysIso(cursor, 7);
  }
  return dates;
}

export function effectiveGenerationRange(params: {
  todayIso: string;
  horizonEndIso: string;
  validFromIso: string;
  validUntilIso: string | null;
}): { from: string; to: string } | null {
  const from = maxIso(params.todayIso, params.validFromIso);
  const to = params.validUntilIso
    ? minIso(params.horizonEndIso, params.validUntilIso)
    : params.horizonEndIso;
  if (from > to) {
    return null;
  }
  return { from, to };
}

export function firstWeekdayOnOrAfter(dateIso: string, weekday: Weekday): string {
  const target = WEEKDAY_TO_UTC_DAY[weekday];
  let cursor = dateIso;
  for (let i = 0; i < 7; i += 1) {
    if (utcWeekday(cursor) === target) {
      return cursor;
    }
    cursor = addDaysIso(cursor, 1);
  }
  return cursor;
}

export function addDaysIso(dateIso: string, days: number): string {
  const [year, month, day] = dateIso.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function utcWeekday(dateIso: string): number {
  const [year, month, day] = dateIso.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function maxIso(a: string, b: string): string {
  return a >= b ? a : b;
}

function minIso(a: string, b: string): string {
  return a <= b ? a : b;
}

function formatUtcYmd(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
