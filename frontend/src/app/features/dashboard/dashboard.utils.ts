/** Local calendar date as YYYY-MM-DD (same convention used by the rest of the frontend). */
export function localDateIso(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDaysIso(dateIso: string, days: number): string {
  const [year, month, day] = dateIso.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function isPaidInLocalMonth(paidAt: string, now = new Date()): boolean {
  const paid = new Date(paidAt);
  return paid.getFullYear() === now.getFullYear() && paid.getMonth() === now.getMonth();
}

export function sumAmounts(amounts: number[]): number {
  return amounts.reduce((total, value) => total + value, 0);
}
