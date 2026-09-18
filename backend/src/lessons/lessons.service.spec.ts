import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CancellationReason, LessonStatus, LessonType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LessonsService } from './lessons.service';

describe('LessonsService', () => {
  const now = new Date('2026-09-10T12:00:00.000Z');
  const studentId = '11111111-1111-4111-8111-111111111111';
  const otherStudentId = '44444444-4444-4444-8444-444444444444';
  const scheduleId = '22222222-2222-4222-8222-222222222222';
  const otherScheduleId = '66666666-6666-4666-8666-666666666666';
  const lessonId = '33333333-3333-4333-8333-333333333333';

  const lessonRow = {
    id: lessonId,
    studentId,
    scheduleId,
    date: new Date('2026-09-15T00:00:00.000Z'),
    startTime: new Date('1970-01-01T14:30:00.000Z'),
    durationMinutes: 60,
    type: LessonType.REGULAR,
    status: LessonStatus.SCHEDULED,
    cancellationReason: null as CancellationReason | null,
    content: 'Intro',
    exercises: null,
    observations: null,
    createdAt: now,
    updatedAt: now,
  };

  const studentCount = jest.fn();
  const studentFindUnique = jest.fn();
  const scheduleFindUnique = jest.fn();
  const scheduleFindMany = jest.fn();
  const scheduleUpdate = jest.fn();
  const lessonCreate = jest.fn();
  const lessonCreateMany = jest.fn();
  const lessonFindMany = jest.fn();
  const lessonFindUnique = jest.fn();
  const lessonUpdate = jest.fn();

  const prisma = {
    student: { count: studentCount, findUnique: studentFindUnique },
    schedule: {
      findUnique: scheduleFindUnique,
      findMany: scheduleFindMany,
      update: scheduleUpdate,
    },
    lesson: {
      create: lessonCreate,
      createMany: lessonCreateMany,
      findMany: lessonFindMany,
      findUnique: lessonFindUnique,
      update: lessonUpdate,
    },
  } as unknown as PrismaService;

  const service = new LessonsService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a REGULAR lesson as SCHEDULED with schedule of same student', async () => {
    studentCount.mockResolvedValue(1);
    scheduleFindUnique.mockResolvedValue({ studentId });
    lessonCreate.mockResolvedValue(lessonRow);

    const result = await service.create({
      studentId,
      scheduleId,
      date: '2026-09-15',
      startTime: '14:30',
      durationMinutes: 60,
      type: LessonType.REGULAR,
    });

    expect(scheduleFindUnique).toHaveBeenCalledWith({
      where: { id: scheduleId },
      select: { studentId: true },
    });
    expect(lessonCreate).toHaveBeenCalled();
    expect(result.type).toBe(LessonType.REGULAR);
    expect(result.status).toBe(LessonStatus.SCHEDULED);
    expect(scheduleUpdate).not.toHaveBeenCalled();
  });

  it('rejects create when schedule belongs to another student', async () => {
    studentCount.mockResolvedValue(1);
    scheduleFindUnique.mockResolvedValue({ studentId: otherStudentId });

    await expect(
      service.create({
        studentId,
        scheduleId: otherScheduleId,
        date: '2026-09-15',
        startTime: '14:30',
        durationMinutes: 60,
        type: LessonType.REGULAR,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(lessonCreate).not.toHaveBeenCalled();
    expect(scheduleUpdate).not.toHaveBeenCalled();
  });

  it('creates a MAKEUP lesson without changing schedule', async () => {
    studentCount.mockResolvedValue(1);
    lessonCreate.mockResolvedValue({
      ...lessonRow,
      scheduleId: null,
      type: LessonType.MAKEUP,
    });

    const result = await service.create({
      studentId,
      date: '2026-09-20',
      startTime: '10:00',
      durationMinutes: 60,
      type: LessonType.MAKEUP,
    });

    expect(result.type).toBe(LessonType.MAKEUP);
    expect(scheduleUpdate).not.toHaveBeenCalled();
  });

  it('creates a ONE_OFF lesson without requiring schedule', async () => {
    studentCount.mockResolvedValue(1);
    lessonCreate.mockResolvedValue({
      ...lessonRow,
      scheduleId: null,
      type: LessonType.ONE_OFF,
    });

    const result = await service.create({
      studentId,
      date: '2026-09-22',
      startTime: '16:00',
      durationMinutes: 45,
      type: LessonType.ONE_OFF,
    });

    expect(result.type).toBe(LessonType.ONE_OFF);
    expect(result.scheduleId).toBeNull();
  });

  it('rejects create when student does not exist', async () => {
    studentCount.mockResolvedValue(0);

    await expect(
      service.create({
        studentId,
        date: '2026-09-15',
        startTime: '14:30',
        durationMinutes: 60,
        type: LessonType.ONE_OFF,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects create when schedule does not exist', async () => {
    studentCount.mockResolvedValue(1);
    scheduleFindUnique.mockResolvedValue(null);

    await expect(
      service.create({
        studentId,
        scheduleId,
        date: '2026-09-15',
        startTime: '14:30',
        durationMinutes: 60,
        type: LessonType.REGULAR,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lists lessons with filters', async () => {
    lessonFindMany.mockResolvedValue([lessonRow]);

    await service.findAll({
      studentId,
      from: '2026-09-01',
      to: '2026-09-30',
      status: LessonStatus.SCHEDULED,
    });

    expect(lessonFindMany).toHaveBeenCalledWith({
      where: {
        studentId,
        status: LessonStatus.SCHEDULED,
        date: {
          gte: new Date('2026-09-01T00:00:00.000Z'),
          lte: new Date('2026-09-30T00:00:00.000Z'),
        },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });
  });

  it('finds lesson by id', async () => {
    lessonFindUnique.mockResolvedValue(lessonRow);

    const result = await service.findOne(lessonId);

    expect(result.id).toBe(lessonId);
  });

  it('updates lesson without updating schedule', async () => {
    lessonFindUnique.mockResolvedValue(lessonRow);
    lessonUpdate.mockResolvedValue({
      ...lessonRow,
      startTime: new Date('1970-01-01T15:00:00.000Z'),
      durationMinutes: 45,
    });

    const result = await service.update(lessonId, {
      startTime: '15:00',
      durationMinutes: 45,
    });

    expect(result.startTime).toBe('15:00:00');
    expect(result.durationMinutes).toBe(45);
    expect(scheduleUpdate).not.toHaveBeenCalled();
  });

  it('rejects PATCH when scheduleId belongs to another student', async () => {
    lessonFindUnique.mockResolvedValue(lessonRow);
    scheduleFindUnique.mockResolvedValue({ studentId: otherStudentId });

    await expect(service.update(lessonId, { scheduleId: otherScheduleId })).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect(lessonUpdate).not.toHaveBeenCalled();
    expect(scheduleUpdate).not.toHaveBeenCalled();
  });

  it('allows PATCH when scheduleId belongs to the same student', async () => {
    const sameStudentScheduleId = '77777777-7777-4777-8777-777777777777';
    lessonFindUnique.mockResolvedValue(lessonRow);
    scheduleFindUnique.mockResolvedValue({ studentId });
    lessonUpdate.mockResolvedValue({
      ...lessonRow,
      scheduleId: sameStudentScheduleId,
    });

    const result = await service.update(lessonId, {
      scheduleId: sameStudentScheduleId,
    });

    expect(result.scheduleId).toBe(sameStudentScheduleId);
    expect(scheduleFindUnique).toHaveBeenCalledWith({
      where: { id: sameStudentScheduleId },
      select: { studentId: true },
    });
    expect(lessonUpdate).toHaveBeenCalled();
    expect(scheduleUpdate).not.toHaveBeenCalled();
  });

  it('transitions SCHEDULED -> COMPLETED', async () => {
    lessonFindUnique.mockResolvedValue(lessonRow);
    lessonUpdate.mockResolvedValue({
      ...lessonRow,
      status: LessonStatus.COMPLETED,
    });

    const result = await service.complete(lessonId);

    expect(result.status).toBe(LessonStatus.COMPLETED);
    expect(scheduleUpdate).not.toHaveBeenCalled();
  });

  it('transitions SCHEDULED -> NO_SHOW', async () => {
    lessonFindUnique.mockResolvedValue(lessonRow);
    lessonUpdate.mockResolvedValue({
      ...lessonRow,
      status: LessonStatus.NO_SHOW,
    });

    const result = await service.noShow(lessonId);

    expect(result.status).toBe(LessonStatus.NO_SHOW);
  });

  it('transitions SCHEDULED -> CANCELLED with reason', async () => {
    lessonFindUnique.mockResolvedValue(lessonRow);
    lessonUpdate.mockResolvedValue({
      ...lessonRow,
      status: LessonStatus.CANCELLED,
      cancellationReason: CancellationReason.STUDENT_CANCELLED,
    });

    const result = await service.cancel(lessonId, {
      cancellationReason: CancellationReason.STUDENT_CANCELLED,
    });

    expect(result.status).toBe(LessonStatus.CANCELLED);
    expect(result.cancellationReason).toBe(CancellationReason.STUDENT_CANCELLED);
    expect(result.content).toBe('Intro');
  });

  it('rejects invalid transition from COMPLETED', async () => {
    lessonFindUnique.mockResolvedValue({
      ...lessonRow,
      status: LessonStatus.COMPLETED,
    });

    await expect(service.complete(lessonId)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.noShow(lessonId)).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.cancel(lessonId, {
        cancellationReason: CancellationReason.OTHER,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows MAKEUP COMPLETED', async () => {
    lessonFindUnique.mockResolvedValue({
      ...lessonRow,
      type: LessonType.MAKEUP,
      status: LessonStatus.SCHEDULED,
    });
    lessonUpdate.mockResolvedValue({
      ...lessonRow,
      type: LessonType.MAKEUP,
      status: LessonStatus.COMPLETED,
    });

    const result = await service.complete(lessonId);

    expect(result.type).toBe(LessonType.MAKEUP);
    expect(result.status).toBe(LessonStatus.COMPLETED);
  });

  describe('generate', () => {
    const generateNow = new Date('2026-09-18T15:00:00.000Z'); // 12:00 São Paulo → 2026-09-18
    const mondaySchedule = {
      id: scheduleId,
      studentId,
      weekday: 'MONDAY' as const,
      startTime: new Date('1970-01-01T19:00:00.000Z'),
      durationMinutes: 60,
      validFrom: new Date('2026-01-01T00:00:00.000Z'),
      validUntil: null as Date | null,
    };

    it('creates REGULAR SCHEDULED lessons weekly up to 3 calendar months', async () => {
      scheduleFindMany.mockResolvedValue([mondaySchedule]);
      lessonCreateMany.mockResolvedValue({ count: 13 });

      const result = await service.generate({}, generateNow);

      expect(result.from).toBe('2026-09-18');
      expect(result.to).toBe('2026-12-18');
      expect(result.schedulesConsidered).toBe(1);
      expect(result.created).toBe(13);
      expect(result.alreadyExisted).toBe(0);

      const createManyCalls = lessonCreateMany.mock.calls as unknown as Array<
        [
          {
            data: Array<{ date: Date; type: LessonType; status: LessonStatus }>;
            skipDuplicates: boolean;
          },
        ]
      >;
      const createManyArg = createManyCalls[0][0];
      expect(createManyArg.skipDuplicates).toBe(true);
      expect(createManyArg.data).toHaveLength(13);
      expect(createManyArg.data[0]).toMatchObject({
        studentId,
        scheduleId,
        type: LessonType.REGULAR,
        status: LessonStatus.SCHEDULED,
        content: null,
        exercises: null,
        observations: null,
        date: new Date('2026-09-21T00:00:00.000Z'),
      });
      expect(createManyArg.data.at(-1)?.date).toEqual(new Date('2026-12-14T00:00:00.000Z'));
      expect(
        createManyArg.data.some((row) => row.date.toISOString().startsWith('2026-12-21')),
      ).toBe(false);
      expect(lessonUpdate).not.toHaveBeenCalled();
    });

    it('is idempotent on second run and never updates existing lessons', async () => {
      studentFindUnique.mockResolvedValue({ id: studentId, status: 'ACTIVE' });
      scheduleFindMany.mockResolvedValue([mondaySchedule]);
      lessonCreateMany.mockResolvedValue({ count: 0 });

      const result = await service.generate({ studentId }, generateNow);

      expect(studentFindUnique).toHaveBeenCalled();
      expect(result.created).toBe(0);
      expect(result.alreadyExisted).toBe(13);
      expect(lessonUpdate).not.toHaveBeenCalled();
      const createManyCalls = lessonCreateMany.mock.calls as unknown as Array<
        [{ skipDuplicates: boolean }]
      >;
      expect(createManyCalls[0][0].skipDuplicates).toBe(true);
    });

    it('respects validFrom and validUntil', async () => {
      scheduleFindMany.mockResolvedValue([
        {
          ...mondaySchedule,
          validFrom: new Date('2026-10-01T00:00:00.000Z'),
          validUntil: new Date('2026-10-15T00:00:00.000Z'),
        },
      ]);
      lessonCreateMany.mockResolvedValue({ count: 2 });

      const result = await service.generate({}, generateNow);
      const createManyCalls = lessonCreateMany.mock.calls as unknown as Array<
        [{ data: Array<{ date: Date }> }]
      >;
      const dates = createManyCalls[0][0].data.map((row) => row.date.toISOString().slice(0, 10));

      expect(dates).toEqual(['2026-10-05', '2026-10-12']);
      expect(result.created).toBe(2);
    });

    it('ignores inactive schedules and inactive students', async () => {
      scheduleFindMany.mockResolvedValue([]);
      studentFindUnique.mockResolvedValue({ id: studentId, status: 'INACTIVE' });

      const result = await service.generate({ studentId }, generateNow);

      expect(scheduleFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            active: true,
            student: {
              status: 'ACTIVE',
              id: studentId,
            },
          },
        }),
      );
      expect(lessonCreateMany).not.toHaveBeenCalled();
      expect(result.created).toBe(0);
      expect(result.schedulesConsidered).toBe(0);
    });

    it('404 when studentId does not exist', async () => {
      studentFindUnique.mockResolvedValue(null);

      await expect(service.generate({ studentId }, generateNow)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(lessonCreateMany).not.toHaveBeenCalled();
    });

    it('does not mutate Schedule during generation', async () => {
      scheduleFindMany.mockResolvedValue([mondaySchedule]);
      lessonCreateMany.mockResolvedValue({ count: 1 });

      await service.generate({}, generateNow);

      expect(scheduleUpdate).not.toHaveBeenCalled();
    });
  });
});
