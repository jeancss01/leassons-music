export type LessonType = 'REGULAR' | 'MAKEUP' | 'ONE_OFF';
export type LessonStatus = 'SCHEDULED' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED';
export type CancellationReason =
  | 'HOLIDAY'
  | 'VACATION'
  | 'TEACHER_CANCELLED'
  | 'STUDENT_CANCELLED'
  | 'OTHER';

export const LESSON_TYPES: LessonType[] = ['REGULAR', 'MAKEUP', 'ONE_OFF'];

export const LESSON_TYPE_LABELS: Record<LessonType, string> = {
  REGULAR: 'Regular',
  MAKEUP: 'Reposição',
  ONE_OFF: 'Avulsa',
};

export const LESSON_STATUS_LABELS: Record<LessonStatus, string> = {
  SCHEDULED: 'Agendada',
  COMPLETED: 'Concluída',
  NO_SHOW: 'Falta',
  CANCELLED: 'Cancelada',
};

export const CANCELLATION_REASONS: CancellationReason[] = [
  'HOLIDAY',
  'VACATION',
  'TEACHER_CANCELLED',
  'STUDENT_CANCELLED',
  'OTHER',
];

export const CANCELLATION_REASON_LABELS: Record<CancellationReason, string> = {
  HOLIDAY: 'Feriado',
  VACATION: 'Férias',
  TEACHER_CANCELLED: 'Cancelada pelo professor',
  STUDENT_CANCELLED: 'Cancelada pelo aluno',
  OTHER: 'Outro',
};

export interface Lesson {
  id: string;
  studentId: string;
  scheduleId: string | null;
  date: string;
  startTime: string;
  durationMinutes: number;
  type: LessonType;
  status: LessonStatus;
  cancellationReason: CancellationReason | null;
  content: string | null;
  exercises: string | null;
  observations: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListLessonsParams {
  studentId?: string;
  from?: string;
  to?: string;
  status?: LessonStatus;
}

export interface CreateLessonRequest {
  studentId: string;
  scheduleId?: string | null;
  date: string;
  startTime: string;
  durationMinutes: number;
  type: LessonType;
  content?: string;
  exercises?: string;
  observations?: string;
}

export interface UpdateLessonRequest {
  scheduleId?: string | null;
  date?: string;
  startTime?: string;
  durationMinutes?: number;
  type?: LessonType;
  content?: string | null;
  exercises?: string | null;
  observations?: string | null;
}

export interface CancelLessonRequest {
  cancellationReason: CancellationReason;
}

export function toTimeInputValue(startTime: string): string {
  return startTime.length >= 5 ? startTime.slice(0, 5) : startTime;
}

export function formatTimeDisplay(startTime: string): string {
  return toTimeInputValue(startTime);
}
