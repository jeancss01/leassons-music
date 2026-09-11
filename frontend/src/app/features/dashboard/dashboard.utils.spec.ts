import { addDaysIso, isPaidInLocalMonth, localDateIso, sumAmounts } from './dashboard.utils';

describe('dashboard.utils', () => {
  it('formats local ISO dates and adds days', () => {
    expect(localDateIso(new Date('2026-09-15T15:00:00'))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(addDaysIso('2026-09-15', 1)).toBe('2026-09-16');
  });

  it('detects paidAt in current local month', () => {
    const now = new Date('2026-09-11T12:00:00');
    expect(isPaidInLocalMonth('2026-09-01T10:00:00.000Z', now)).toBe(true);
    expect(isPaidInLocalMonth('2026-08-31T10:00:00.000Z', now)).toBe(false);
  });

  it('sums amounts', () => {
    expect(sumAmounts([200, 180.5])).toBe(380.5);
  });
});
