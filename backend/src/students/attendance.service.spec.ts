import { BadRequestException, NotFoundException } from '@nestjs/common';
import { LessonStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { computeFrequency, resolveAttendancePeriod } from './attendance.math';
import { AttendanceService } from './attendance.service';

describe('attendance.math', () => {
  it('computes 3 COMPLETED + 1 NO_SHOW = 0.75', () => {
    expect(computeFrequency(3, 1)).toBe(0.75);
  });

  it('returns 0 when totalConsidered is 0', () => {
    expect(computeFrequency(0, 0)).toBe(0);
  });

  it('rejects from > to', () => {
    expect(() => resolveAttendancePeriod('2026-09-30', '2026-09-01')).toThrow(BadRequestException);
  });

  it('requires both from and to when one is provided', () => {
    expect(() => resolveAttendancePeriod('2026-09-01', undefined)).toThrow(BadRequestException);
    expect(() => resolveAttendancePeriod(undefined, '2026-09-30')).toThrow(BadRequestException);
  });

  it('defaults to current month in America/Sao_Paulo', () => {
    const now = new Date('2026-09-15T15:00:00.000Z');
    expect(resolveAttendancePeriod(undefined, undefined, now)).toEqual({
      from: '2026-09-01',
      to: '2026-09-30',
    });
  });
});

describe('AttendanceService', () => {
  const studentId = '11111111-1111-4111-8111-111111111111';
  const studentCount = jest.fn();
  const lessonFindMany = jest.fn();

  const prisma = {
    student: { count: studentCount },
    lesson: { findMany: lessonFindMany },
  } as unknown as PrismaService;

  const service = new AttendanceService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calculates frequency ignoring CANCELLED and counting MAKEUP/ONE_OFF COMPLETED', async () => {
    studentCount.mockResolvedValue(1);
    lessonFindMany.mockResolvedValue([
      { status: LessonStatus.COMPLETED },
      { status: LessonStatus.COMPLETED },
      { status: LessonStatus.COMPLETED },
      { status: LessonStatus.NO_SHOW },
      { status: LessonStatus.CANCELLED },
      { status: LessonStatus.CANCELLED },
      { status: LessonStatus.SCHEDULED },
    ]);

    const result = await service.getForStudent(studentId, {
      from: '2026-09-01',
      to: '2026-09-30',
    });

    expect(result.completed).toBe(3);
    expect(result.noShow).toBe(1);
    expect(result.cancelled).toBe(2);
    expect(result.totalConsidered).toBe(4);
    expect(result.frequency).toBe(0.75);
  });

  it('treats only CANCELLED as frequency 0', async () => {
    studentCount.mockResolvedValue(1);
    lessonFindMany.mockResolvedValue([
      { status: LessonStatus.CANCELLED },
      { status: LessonStatus.CANCELLED },
    ]);

    const result = await service.getForStudent(studentId, {
      from: '2026-09-01',
      to: '2026-09-30',
    });

    expect(result.frequency).toBe(0);
    expect(result.totalConsidered).toBe(0);
    expect(result.cancelled).toBe(2);
  });

  it('returns frequency 0 when there are no lessons', async () => {
    studentCount.mockResolvedValue(1);
    lessonFindMany.mockResolvedValue([]);

    const result = await service.getForStudent(studentId, {
      from: '2026-09-01',
      to: '2026-09-30',
    });

    expect(result).toMatchObject({
      completed: 0,
      noShow: 0,
      cancelled: 0,
      totalConsidered: 0,
      frequency: 0,
    });
  });

  it('applies from/to filters to lesson query', async () => {
    studentCount.mockResolvedValue(1);
    lessonFindMany.mockResolvedValue([]);

    await service.getForStudent(studentId, { from: '2026-09-10', to: '2026-09-20' });

    expect(lessonFindMany).toHaveBeenCalledWith({
      where: {
        studentId,
        date: {
          gte: new Date('2026-09-10T00:00:00.000Z'),
          lte: new Date('2026-09-20T00:00:00.000Z'),
        },
      },
      select: { status: true },
    });
  });

  it('rejects missing student', async () => {
    studentCount.mockResolvedValue(0);

    await expect(
      service.getForStudent(studentId, { from: '2026-09-01', to: '2026-09-30' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
