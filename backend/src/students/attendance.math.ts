import { BadRequestException } from '@nestjs/common';

const TIME_ZONE = 'America/Sao_Paulo';

/** Returns inclusive YYYY-MM-DD bounds for the current calendar month in America/Sao_Paulo (BR-039). */
export function currentMonthRangeSaoPaulo(now: Date = new Date()): { from: string; to: string } {
  const today = formatDateInTimeZone(now, TIME_ZONE);
  const [year, month] = today.split('-').map(Number);
  const from = `${year}-${pad(month)}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const to = `${year}-${pad(month)}-${pad(lastDay)}`;
  return { from, to };
}

export function resolveAttendancePeriod(
  from?: string,
  to?: string,
  now: Date = new Date(),
): { from: string; to: string } {
  if (from === undefined && to === undefined) {
    return currentMonthRangeSaoPaulo(now);
  }

  if (from === undefined || to === undefined) {
    throw new BadRequestException('Both from and to are required when filtering by date range');
  }

  if (from > to) {
    throw new BadRequestException('from must be less than or equal to to');
  }

  return { from, to };
}

/** frequency in [0, 1]; 0 when denominator is 0. Avoids float noise for common ratios. */
export function computeFrequency(completed: number, noShow: number): number {
  const total = completed + noShow;
  if (total === 0) {
    return 0;
  }
  return roundFrequency(completed / total);
}

function roundFrequency(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function formatDateInTimeZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}
