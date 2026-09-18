import { Weekday } from '@prisma/client';
import {
  addCalendarMonths,
  addDaysIso,
  effectiveGenerationRange,
  firstWeekdayOnOrAfter,
  planningHorizonEnd,
  todaySaoPaulo,
  weeklyOccurrenceDates,
} from './lesson-generation';

describe('lesson-generation', () => {
  it('computes today in America/Sao_Paulo without UTC day shift', () => {
    // 2026-09-18 03:00 UTC is still 2026-09-18 in São Paulo (UTC-3)
    expect(todaySaoPaulo(new Date('2026-09-18T03:00:00.000Z'))).toBe('2026-09-18');
    // 2026-09-18 02:00 UTC is still 2026-09-17 evening in São Paulo
    expect(todaySaoPaulo(new Date('2026-09-18T02:00:00.000Z'))).toBe('2026-09-17');
  });

  it('adds 3 calendar months for the planning horizon', () => {
    expect(addCalendarMonths('2026-09-18', 3)).toBe('2026-12-18');
    expect(planningHorizonEnd('2026-09-18')).toBe('2026-12-18');
    expect(addCalendarMonths('2026-01-31', 1)).toBe('2026-02-28');
  });

  it('finds first weekday on or after a date', () => {
    // 2026-09-18 is Friday
    expect(firstWeekdayOnOrAfter('2026-09-18', Weekday.MONDAY)).toBe('2026-09-21');
    expect(firstWeekdayOnOrAfter('2026-09-21', Weekday.MONDAY)).toBe('2026-09-21');
  });

  it('generates weekly occurrences within inclusive range', () => {
    const dates = weeklyOccurrenceDates(Weekday.MONDAY, '2026-09-18', '2026-10-05');
    expect(dates).toEqual(['2026-09-21', '2026-09-28', '2026-10-05']);
  });

  it('does not generate past the horizon end', () => {
    const dates = weeklyOccurrenceDates(Weekday.MONDAY, '2026-12-15', '2026-12-18');
    expect(dates).toEqual([]);
    expect(weeklyOccurrenceDates(Weekday.FRIDAY, '2026-12-15', '2026-12-18')).toEqual([
      '2026-12-18',
    ]);
  });

  it('respects validFrom and validUntil via effective range', () => {
    expect(
      effectiveGenerationRange({
        todayIso: '2026-09-18',
        horizonEndIso: '2026-12-18',
        validFromIso: '2026-10-01',
        validUntilIso: null,
      }),
    ).toEqual({ from: '2026-10-01', to: '2026-12-18' });

    expect(
      effectiveGenerationRange({
        todayIso: '2026-09-18',
        horizonEndIso: '2026-12-18',
        validFromIso: '2026-01-01',
        validUntilIso: '2026-10-01',
      }),
    ).toEqual({ from: '2026-09-18', to: '2026-10-01' });

    expect(
      effectiveGenerationRange({
        todayIso: '2026-09-18',
        horizonEndIso: '2026-12-18',
        validFromIso: '2027-01-01',
        validUntilIso: null,
      }),
    ).toBeNull();
  });

  it('adds days without shifting the calendar day', () => {
    expect(addDaysIso('2026-09-21', 7)).toBe('2026-09-28');
    expect(addDaysIso('2026-12-28', 7)).toBe('2027-01-04');
  });
});
