import { Lesson } from '@prisma/client';
import { LessonResponseDto } from './dto/lesson-response.dto';

export function toLessonResponse(lesson: Lesson): LessonResponseDto {
  return {
    id: lesson.id,
    studentId: lesson.studentId,
    scheduleId: lesson.scheduleId,
    date: formatDateOnly(lesson.date),
    startTime: formatTimeOnly(lesson.startTime),
    durationMinutes: lesson.durationMinutes,
    type: lesson.type,
    status: lesson.status,
    cancellationReason: lesson.cancellationReason,
    content: lesson.content,
    exercises: lesson.exercises,
    observations: lesson.observations,
    createdAt: lesson.createdAt.toISOString(),
    updatedAt: lesson.updatedAt.toISOString(),
  };
}

export function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function parseTimeOnly(value: string): Date {
  const normalized = value.length === 5 ? `${value}:00` : value;
  return new Date(`1970-01-01T${normalized}.000Z`);
}

function formatDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function formatTimeOnly(value: Date): string {
  return value.toISOString().slice(11, 19);
}
