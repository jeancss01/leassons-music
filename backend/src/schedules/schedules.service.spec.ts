import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Weekday } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SchedulesService } from './schedules.service';

describe('SchedulesService', () => {
  const now = new Date('2026-09-10T12:00:00.000Z');
  const studentId = '11111111-1111-4111-8111-111111111111';
  const scheduleId = '22222222-2222-4222-8222-222222222222';

  const scheduleRow = {
    id: scheduleId,
    studentId,
    weekday: Weekday.MONDAY,
    startTime: new Date('1970-01-01T14:30:00.000Z'),
    durationMinutes: 60,
    validFrom: new Date('2026-01-15T00:00:00.000Z'),
    validUntil: null as Date | null,
    active: true,
    createdAt: now,
    updatedAt: now,
  };

  const studentCount = jest.fn();
  const scheduleCreate = jest.fn();
  const scheduleFindMany = jest.fn();
  const scheduleFindUnique = jest.fn();
  const scheduleUpdate = jest.fn();
  const lessonUpdate = jest.fn();
  const lessonFindMany = jest.fn();

  const prisma = {
    student: { count: studentCount },
    schedule: {
      create: scheduleCreate,
      findMany: scheduleFindMany,
      findUnique: scheduleFindUnique,
      update: scheduleUpdate,
    },
    lesson: {
      update: lessonUpdate,
      findMany: lessonFindMany,
    },
  } as unknown as PrismaService;

  const service = new SchedulesService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a valid schedule', async () => {
    studentCount.mockResolvedValue(1);
    scheduleCreate.mockResolvedValue(scheduleRow);

    const result = await service.create(studentId, {
      weekday: Weekday.MONDAY,
      startTime: '14:30',
      durationMinutes: 60,
      validFrom: '2026-01-15',
    });

    expect(scheduleCreate).toHaveBeenCalled();
    expect(result.studentId).toBe(studentId);
    expect(result.weekday).toBe(Weekday.MONDAY);
    expect(result.startTime).toBe('14:30:00');
    expect(result.durationMinutes).toBe(60);
    expect(result.active).toBe(true);
  });

  it('rejects create when student does not exist', async () => {
    studentCount.mockResolvedValue(0);

    await expect(
      service.create(studentId, {
        weekday: Weekday.MONDAY,
        startTime: '14:30',
        durationMinutes: 60,
        validFrom: '2026-01-15',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(scheduleCreate).not.toHaveBeenCalled();
  });

  it('rejects validUntil earlier than validFrom', async () => {
    studentCount.mockResolvedValue(1);

    await expect(
      service.create(studentId, {
        weekday: Weekday.MONDAY,
        startTime: '14:30',
        durationMinutes: 60,
        validFrom: '2026-06-01',
        validUntil: '2026-01-01',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(scheduleCreate).not.toHaveBeenCalled();
  });

  it('lists all schedules for a student including historical', async () => {
    studentCount.mockResolvedValue(1);
    const historical = {
      ...scheduleRow,
      id: '33333333-3333-4333-8333-333333333333',
      active: false,
      validUntil: new Date('2026-03-01T00:00:00.000Z'),
    };
    scheduleFindMany.mockResolvedValue([scheduleRow, historical]);

    const result = await service.findByStudent(studentId);

    expect(scheduleFindMany).toHaveBeenCalledWith({
      where: { studentId },
      orderBy: [{ weekday: 'asc' }, { startTime: 'asc' }, { validFrom: 'asc' }],
    });
    expect(result).toHaveLength(2);
    expect(result.some((item) => item.active === false)).toBe(true);
  });

  it('updates a schedule', async () => {
    scheduleFindUnique.mockResolvedValue(scheduleRow);
    scheduleUpdate.mockResolvedValue({
      ...scheduleRow,
      durationMinutes: 45,
      startTime: new Date('1970-01-01T15:00:00.000Z'),
    });

    const result = await service.update(scheduleId, {
      durationMinutes: 45,
      startTime: '15:00',
    });

    expect(scheduleUpdate).toHaveBeenCalled();
    expect(result.durationMinutes).toBe(45);
    expect(result.startTime).toBe('15:00:00');
  });

  it('does not update lessons when updating a schedule', async () => {
    scheduleFindUnique.mockResolvedValue(scheduleRow);
    scheduleUpdate.mockResolvedValue({
      ...scheduleRow,
      weekday: Weekday.WEDNESDAY,
    });

    await service.update(scheduleId, { weekday: Weekday.WEDNESDAY });

    expect(scheduleUpdate).toHaveBeenCalled();
    expect(lessonUpdate).not.toHaveBeenCalled();
  });

  it('rejects update when schedule does not exist', async () => {
    scheduleFindUnique.mockResolvedValue(null);

    await expect(service.update(scheduleId, { durationMinutes: 30 })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects update when resulting validUntil is before validFrom', async () => {
    scheduleFindUnique.mockResolvedValue(scheduleRow);

    await expect(service.update(scheduleId, { validUntil: '2020-01-01' })).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect(scheduleUpdate).not.toHaveBeenCalled();
  });
});
