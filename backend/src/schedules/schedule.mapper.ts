import { Schedule } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';
import { ScheduleResponseDto } from './dto/schedule-response.dto';

export function toScheduleResponse(schedule: Schedule): ScheduleResponseDto {
  return {
    id: schedule.id,
    studentId: schedule.studentId,
    weekday: schedule.weekday,
    startTime: formatTimeOnly(schedule.startTime),
    durationMinutes: schedule.durationMinutes,
    validFrom: formatDateOnly(schedule.validFrom),
    validUntil: schedule.validUntil ? formatDateOnly(schedule.validUntil) : null,
    active: schedule.active,
    createdAt: schedule.createdAt.toISOString(),
    updatedAt: schedule.updatedAt.toISOString(),
  };
}

export function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function parseTimeOnly(value: string): Date {
  const normalized = value.length === 5 ? `${value}:00` : value;
  return new Date(`1970-01-01T${normalized}.000Z`);
}

export function formatDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function formatTimeOnly(value: Date): string {
  return value.toISOString().slice(11, 19);
}

export function assertValidDateRange(validFrom: Date, validUntil: Date | null): void {
  if (validUntil !== null && validUntil < validFrom) {
    throw new BadRequestException('validUntil cannot be earlier than validFrom');
  }
}
