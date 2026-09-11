export type Weekday =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';

export const WEEKDAYS: Weekday[] = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
];

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  MONDAY: 'Segunda-feira',
  TUESDAY: 'Terça-feira',
  WEDNESDAY: 'Quarta-feira',
  THURSDAY: 'Quinta-feira',
  FRIDAY: 'Sexta-feira',
  SATURDAY: 'Sábado',
  SUNDAY: 'Domingo',
};

export interface Schedule {
  id: string;
  studentId: string;
  weekday: Weekday;
  startTime: string;
  durationMinutes: number;
  validFrom: string;
  validUntil: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateScheduleRequest {
  weekday: Weekday;
  startTime: string;
  durationMinutes: number;
  validFrom: string;
  validUntil?: string | null;
  active?: boolean;
}

export interface UpdateScheduleRequest {
  weekday?: Weekday;
  startTime?: string;
  durationMinutes?: number;
  validFrom?: string;
  validUntil?: string | null;
  active?: boolean;
}

/** API returns HH:mm:ss; HTML time inputs use HH:mm. */
export function toTimeInputValue(startTime: string): string {
  return startTime.length >= 5 ? startTime.slice(0, 5) : startTime;
}

export function formatTimeDisplay(startTime: string): string {
  return toTimeInputValue(startTime);
}
