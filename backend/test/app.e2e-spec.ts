import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  CancellationReason,
  LessonStatus,
  LessonType,
  MonthlyChargeStatus,
  Prisma,
  StudentStatus,
  Weekday,
} from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('API (e2e)', () => {
  let app: INestApplication<App>;
  let accessToken: string;

  const now = new Date('2026-09-10T12:00:00.000Z');
  const studentRow = {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Maria Silva',
    email: null,
    phone: null,
    startDate: new Date('2026-01-15T00:00:00.000Z'),
    monthlyFee: new Prisma.Decimal(200),
    status: StudentStatus.ACTIVE,
    notes: null,
    createdAt: now,
    updatedAt: now,
  };

  const scheduleRow = {
    id: '22222222-2222-4222-8222-222222222222',
    studentId: studentRow.id,
    weekday: Weekday.MONDAY,
    startTime: new Date('1970-01-01T14:30:00.000Z'),
    durationMinutes: 60,
    validFrom: new Date('2026-01-15T00:00:00.000Z'),
    validUntil: null as Date | null,
    active: true,
    createdAt: now,
    updatedAt: now,
  };

  const lessonRow = {
    id: '33333333-3333-4333-8333-333333333333',
    studentId: studentRow.id,
    scheduleId: scheduleRow.id,
    date: new Date('2026-09-15T00:00:00.000Z'),
    startTime: new Date('1970-01-01T14:30:00.000Z'),
    durationMinutes: 60,
    type: LessonType.REGULAR,
    status: LessonStatus.SCHEDULED,
    cancellationReason: null as CancellationReason | null,
    content: 'Intro',
    exercises: null as string | null,
    observations: null as string | null,
    createdAt: now,
    updatedAt: now,
  };

  const monthlyChargeRow = {
    id: '55555555-5555-4555-8555-555555555555',
    studentId: studentRow.id,
    referenceMonth: '2026-09',
    amount: new Prisma.Decimal(200),
    dueDate: null as Date | null,
    status: MonthlyChargeStatus.PENDING,
    paidAt: null as Date | null,
    notes: null as string | null,
    createdAt: now,
    updatedAt: now,
  };

  const prismaMock = {
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    student: {
      create: jest.fn().mockResolvedValue(studentRow),
      findMany: jest.fn().mockResolvedValue([studentRow]),
      findUnique: jest.fn().mockResolvedValue(studentRow),
      update: jest.fn().mockResolvedValue({
        ...studentRow,
        status: StudentStatus.INACTIVE,
      }),
      count: jest.fn().mockResolvedValue(1),
    },
    schedule: {
      create: jest.fn().mockResolvedValue(scheduleRow),
      findMany: jest.fn().mockResolvedValue([scheduleRow]),
      findUnique: jest.fn().mockResolvedValue(scheduleRow),
      update: jest.fn().mockResolvedValue({
        ...scheduleRow,
        durationMinutes: 45,
      }),
      count: jest.fn().mockResolvedValue(1),
    },
    lesson: {
      create: jest.fn().mockResolvedValue(lessonRow),
      findMany: jest.fn().mockResolvedValue([lessonRow]),
      findUnique: jest.fn().mockResolvedValue(lessonRow),
      update: jest.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({
          ...lessonRow,
          ...data,
          scheduleId:
            data.schedule === undefined
              ? lessonRow.scheduleId
              : data.schedule && typeof data.schedule === 'object' && 'disconnect' in data.schedule
                ? null
                : lessonRow.scheduleId,
        }),
      ),
    },
    monthlyCharge: {
      create: jest.fn().mockResolvedValue(monthlyChargeRow),
      findMany: jest.fn().mockResolvedValue([monthlyChargeRow]),
      findUnique: jest.fn().mockResolvedValue(monthlyChargeRow),
      update: jest.fn().mockResolvedValue(monthlyChargeRow),
    },
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'admin', password: 'change-me' })
      .expect(200);

    accessToken = (login.body as { accessToken: string }).accessToken;
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  it('GET /health', async () => {
    const response = await request(app.getHttpServer()).get('/health').expect(200);
    expect(response.body).toEqual({ status: 'ok', database: 'up' });
  });

  it('POST /auth/login with valid credentials', () => {
    expect(typeof accessToken).toBe('string');
    expect(accessToken.length).toBeGreaterThan(0);
  });

  it('POST /auth/login rejects invalid credentials', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'admin', password: 'wrong' })
      .expect(401);
  });

  it('rejects unauthenticated access to /students', async () => {
    await request(app.getHttpServer()).get('/students').expect(401);
  });

  it('POST /students creates a student', async () => {
    const response = await request(app.getHttpServer())
      .post('/students')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Maria Silva',
        startDate: '2026-01-15',
        monthlyFee: 200,
      })
      .expect(201);

    const body = response.body as { id: string; status: string; monthlyFee: number };
    expect(body.id).toBe(studentRow.id);
    expect(body.status).toBe('ACTIVE');
    expect(body.monthlyFee).toBe(200);
  });

  it('GET /students lists active students by default', async () => {
    const response = await request(app.getHttpServer())
      .get('/students')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(prismaMock.student.findMany).toHaveBeenCalled();
  });

  it('PATCH /students/:id/inactivate inactivates the student', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/students/${studentRow.id}/inactivate`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const body = response.body as { status: string };
    expect(body.status).toBe('INACTIVE');
  });

  it('rejects unauthenticated access to schedule endpoints', async () => {
    await request(app.getHttpServer()).get(`/students/${studentRow.id}/schedule`).expect(401);
    await request(app.getHttpServer())
      .post(`/students/${studentRow.id}/schedule`)
      .send({
        weekday: 'MONDAY',
        startTime: '14:30',
        durationMinutes: 60,
        validFrom: '2026-01-15',
      })
      .expect(401);
    await request(app.getHttpServer())
      .patch(`/schedules/${scheduleRow.id}`)
      .send({ durationMinutes: 45 })
      .expect(401);
  });

  it('POST /students/:id/schedule creates a schedule', async () => {
    const response = await request(app.getHttpServer())
      .post(`/students/${studentRow.id}/schedule`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        weekday: 'MONDAY',
        startTime: '14:30',
        durationMinutes: 60,
        validFrom: '2026-01-15',
      })
      .expect(201);

    const body = response.body as {
      id: string;
      studentId: string;
      weekday: string;
      startTime: string;
    };
    expect(body.id).toBe(scheduleRow.id);
    expect(body.studentId).toBe(studentRow.id);
    expect(body.weekday).toBe('MONDAY');
    expect(body.startTime).toBe('14:30:00');
  });

  it('POST /students/:id/schedule rejects invalid weekday', async () => {
    await request(app.getHttpServer())
      .post(`/students/${studentRow.id}/schedule`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        weekday: 'FUNDAY',
        startTime: '14:30',
        durationMinutes: 60,
        validFrom: '2026-01-15',
      })
      .expect(400);

    expect(prismaMock.schedule.create).not.toHaveBeenCalled();
  });

  it('POST /students/:id/schedule rejects invalid duration', async () => {
    await request(app.getHttpServer())
      .post(`/students/${studentRow.id}/schedule`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        weekday: 'MONDAY',
        startTime: '14:30',
        durationMinutes: 0,
        validFrom: '2026-01-15',
      })
      .expect(400);

    expect(prismaMock.schedule.create).not.toHaveBeenCalled();
  });

  it('POST /students/:id/schedule rejects validUntil before validFrom', async () => {
    await request(app.getHttpServer())
      .post(`/students/${studentRow.id}/schedule`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        weekday: 'MONDAY',
        startTime: '14:30',
        durationMinutes: 60,
        validFrom: '2026-06-01',
        validUntil: '2026-01-01',
      })
      .expect(400);

    expect(prismaMock.schedule.create).not.toHaveBeenCalled();
  });

  it('POST /students/:id/schedule returns 404 for missing student', async () => {
    prismaMock.student.count.mockResolvedValueOnce(0);

    await request(app.getHttpServer())
      .post(`/students/${studentRow.id}/schedule`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        weekday: 'MONDAY',
        startTime: '14:30',
        durationMinutes: 60,
        validFrom: '2026-01-15',
      })
      .expect(404);
  });

  it('GET /students/:id/schedule lists schedules', async () => {
    const response = await request(app.getHttpServer())
      .get(`/students/${studentRow.id}/schedule`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(prismaMock.schedule.findMany).toHaveBeenCalled();
  });

  it('PATCH /schedules/:id updates schedule without touching lessons', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/schedules/${scheduleRow.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ durationMinutes: 45 })
      .expect(200);

    const body = response.body as { durationMinutes: number };
    expect(body.durationMinutes).toBe(45);
    expect(prismaMock.schedule.update).toHaveBeenCalled();
  });

  it('rejects unauthenticated access to /lessons', async () => {
    await request(app.getHttpServer()).get('/lessons').expect(401);
  });

  it('POST /lessons creates a REGULAR lesson', async () => {
    const response = await request(app.getHttpServer())
      .post('/lessons')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        studentId: studentRow.id,
        scheduleId: scheduleRow.id,
        date: '2026-09-15',
        startTime: '14:30',
        durationMinutes: 60,
        type: 'REGULAR',
      })
      .expect(201);

    const body = response.body as { type: string; status: string; scheduleId: string };
    expect(body.type).toBe('REGULAR');
    expect(body.status).toBe('SCHEDULED');
    expect(body.scheduleId).toBe(scheduleRow.id);
    expect(prismaMock.schedule.update).not.toHaveBeenCalled();
  });

  it('POST /lessons rejects schedule belonging to another student', async () => {
    const otherScheduleId = '66666666-6666-4666-8666-666666666666';
    prismaMock.schedule.findUnique.mockResolvedValueOnce({
      ...scheduleRow,
      id: otherScheduleId,
      studentId: '44444444-4444-4444-8444-444444444444',
    });

    await request(app.getHttpServer())
      .post('/lessons')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        studentId: studentRow.id,
        scheduleId: otherScheduleId,
        date: '2026-09-15',
        startTime: '14:30',
        durationMinutes: 60,
        type: 'REGULAR',
      })
      .expect(400);

    expect(prismaMock.lesson.create).not.toHaveBeenCalled();
    expect(prismaMock.schedule.update).not.toHaveBeenCalled();
  });

  it('POST /lessons creates MAKEUP and ONE_OFF', async () => {
    prismaMock.lesson.create
      .mockResolvedValueOnce({
        ...lessonRow,
        type: LessonType.MAKEUP,
        scheduleId: null,
      })
      .mockResolvedValueOnce({
        ...lessonRow,
        type: LessonType.ONE_OFF,
        scheduleId: null,
      });

    const makeup = await request(app.getHttpServer())
      .post('/lessons')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        studentId: studentRow.id,
        date: '2026-09-20',
        startTime: '10:00',
        durationMinutes: 60,
        type: 'MAKEUP',
      })
      .expect(201);

    const oneOff = await request(app.getHttpServer())
      .post('/lessons')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        studentId: studentRow.id,
        date: '2026-09-22',
        startTime: '16:00',
        durationMinutes: 45,
        type: 'ONE_OFF',
      })
      .expect(201);

    expect((makeup.body as { type: string }).type).toBe('MAKEUP');
    expect((oneOff.body as { type: string }).type).toBe('ONE_OFF');
    expect(prismaMock.schedule.update).not.toHaveBeenCalled();
  });

  it('POST /lessons returns 404 for missing student', async () => {
    prismaMock.student.count.mockResolvedValueOnce(0);

    await request(app.getHttpServer())
      .post('/lessons')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        studentId: studentRow.id,
        date: '2026-09-15',
        startTime: '14:30',
        durationMinutes: 60,
        type: 'ONE_OFF',
      })
      .expect(404);
  });

  it('POST /lessons returns 404 for missing schedule', async () => {
    prismaMock.schedule.findUnique.mockResolvedValueOnce(null);

    await request(app.getHttpServer())
      .post('/lessons')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        studentId: studentRow.id,
        scheduleId: scheduleRow.id,
        date: '2026-09-15',
        startTime: '14:30',
        durationMinutes: 60,
        type: 'REGULAR',
      })
      .expect(404);
  });

  it('GET /lessons lists and filters', async () => {
    const response = await request(app.getHttpServer())
      .get('/lessons')
      .query({
        studentId: studentRow.id,
        from: '2026-09-01',
        to: '2026-09-30',
        status: 'SCHEDULED',
      })
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(prismaMock.lesson.findMany).toHaveBeenCalled();
  });

  it('GET /lessons/:id returns a lesson', async () => {
    const response = await request(app.getHttpServer())
      .get(`/lessons/${lessonRow.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect((response.body as { id: string }).id).toBe(lessonRow.id);
  });

  it('PATCH /lessons/:id updates lesson without changing schedule', async () => {
    prismaMock.lesson.update.mockResolvedValueOnce({
      ...lessonRow,
      startTime: new Date('1970-01-01T15:00:00.000Z'),
      durationMinutes: 45,
    });

    const response = await request(app.getHttpServer())
      .patch(`/lessons/${lessonRow.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ startTime: '15:00', durationMinutes: 45 })
      .expect(200);

    const body = response.body as { startTime: string; durationMinutes: number };
    expect(body.startTime).toBe('15:00:00');
    expect(body.durationMinutes).toBe(45);
    expect(prismaMock.schedule.update).not.toHaveBeenCalled();
  });

  it('PATCH /lessons/:id rejects schedule belonging to another student', async () => {
    const otherScheduleId = '66666666-6666-4666-8666-666666666666';
    prismaMock.schedule.findUnique.mockResolvedValueOnce({
      ...scheduleRow,
      id: otherScheduleId,
      studentId: '44444444-4444-4444-8444-444444444444',
    });

    await request(app.getHttpServer())
      .patch(`/lessons/${lessonRow.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ scheduleId: otherScheduleId })
      .expect(400);

    expect(prismaMock.lesson.update).not.toHaveBeenCalled();
    expect(prismaMock.schedule.update).not.toHaveBeenCalled();
  });

  it('PATCH /lessons/:id accepts schedule belonging to the same student', async () => {
    const sameStudentScheduleId = '77777777-7777-4777-8777-777777777777';
    prismaMock.schedule.findUnique.mockResolvedValueOnce({
      ...scheduleRow,
      id: sameStudentScheduleId,
      studentId: studentRow.id,
    });
    prismaMock.lesson.update.mockResolvedValueOnce({
      ...lessonRow,
      scheduleId: sameStudentScheduleId,
    });

    const response = await request(app.getHttpServer())
      .patch(`/lessons/${lessonRow.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ scheduleId: sameStudentScheduleId })
      .expect(200);

    expect((response.body as { scheduleId: string }).scheduleId).toBe(sameStudentScheduleId);
    expect(prismaMock.schedule.update).not.toHaveBeenCalled();
  });

  it('POST /lessons/:id/complete transitions SCHEDULED -> COMPLETED', async () => {
    prismaMock.lesson.update.mockResolvedValueOnce({
      ...lessonRow,
      status: LessonStatus.COMPLETED,
    });

    const response = await request(app.getHttpServer())
      .post(`/lessons/${lessonRow.id}/complete`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect((response.body as { status: string }).status).toBe('COMPLETED');
    expect(prismaMock.schedule.update).not.toHaveBeenCalled();
  });

  it('POST /lessons/:id/no-show transitions SCHEDULED -> NO_SHOW', async () => {
    prismaMock.lesson.update.mockResolvedValueOnce({
      ...lessonRow,
      status: LessonStatus.NO_SHOW,
    });

    const response = await request(app.getHttpServer())
      .post(`/lessons/${lessonRow.id}/no-show`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect((response.body as { status: string }).status).toBe('NO_SHOW');
  });

  it('POST /lessons/:id/cancel requires cancellationReason', async () => {
    await request(app.getHttpServer())
      .post(`/lessons/${lessonRow.id}/cancel`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({})
      .expect(400);
  });

  it('POST /lessons/:id/cancel transitions SCHEDULED -> CANCELLED', async () => {
    prismaMock.lesson.update.mockResolvedValueOnce({
      ...lessonRow,
      status: LessonStatus.CANCELLED,
      cancellationReason: CancellationReason.HOLIDAY,
    });

    const response = await request(app.getHttpServer())
      .post(`/lessons/${lessonRow.id}/cancel`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ cancellationReason: 'HOLIDAY' })
      .expect(200);

    const body = response.body as {
      status: string;
      cancellationReason: string;
      content: string;
    };
    expect(body.status).toBe('CANCELLED');
    expect(body.cancellationReason).toBe('HOLIDAY');
    expect(body.content).toBe('Intro');
  });

  it('rejects invalid state transitions', async () => {
    prismaMock.lesson.findUnique.mockResolvedValueOnce({
      ...lessonRow,
      status: LessonStatus.COMPLETED,
    });

    await request(app.getHttpServer())
      .post(`/lessons/${lessonRow.id}/complete`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(400);
  });

  it('completes a MAKEUP lesson', async () => {
    prismaMock.lesson.findUnique.mockResolvedValueOnce({
      ...lessonRow,
      type: LessonType.MAKEUP,
      status: LessonStatus.SCHEDULED,
    });
    prismaMock.lesson.update.mockResolvedValueOnce({
      ...lessonRow,
      type: LessonType.MAKEUP,
      status: LessonStatus.COMPLETED,
    });

    const response = await request(app.getHttpServer())
      .post(`/lessons/${lessonRow.id}/complete`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const body = response.body as { type: string; status: string };
    expect(body.type).toBe('MAKEUP');
    expect(body.status).toBe('COMPLETED');
  });

  it('rejects unauthenticated access to attendance', async () => {
    await request(app.getHttpServer()).get(`/students/${studentRow.id}/attendance`).expect(401);
  });

  it('GET /students/:id/attendance returns 75% for 3 completed + 1 no-show', async () => {
    prismaMock.lesson.findMany.mockResolvedValueOnce([
      { status: LessonStatus.COMPLETED },
      { status: LessonStatus.COMPLETED },
      { status: LessonStatus.COMPLETED },
      { status: LessonStatus.NO_SHOW },
      { status: LessonStatus.CANCELLED },
    ]);

    const response = await request(app.getHttpServer())
      .get(`/students/${studentRow.id}/attendance`)
      .query({ from: '2026-09-01', to: '2026-09-30' })
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const body = response.body as {
      completed: number;
      noShow: number;
      cancelled: number;
      totalConsidered: number;
      frequency: number;
    };
    expect(body.completed).toBe(3);
    expect(body.noShow).toBe(1);
    expect(body.cancelled).toBe(1);
    expect(body.totalConsidered).toBe(4);
    expect(body.frequency).toBe(0.75);
  });

  it('GET /students/:id/attendance returns 0 for only cancelled or empty', async () => {
    prismaMock.lesson.findMany.mockResolvedValueOnce([{ status: LessonStatus.CANCELLED }]);

    const cancelledOnly = await request(app.getHttpServer())
      .get(`/students/${studentRow.id}/attendance`)
      .query({ from: '2026-09-01', to: '2026-09-30' })
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect((cancelledOnly.body as { frequency: number }).frequency).toBe(0);

    prismaMock.lesson.findMany.mockResolvedValueOnce([]);

    const empty = await request(app.getHttpServer())
      .get(`/students/${studentRow.id}/attendance`)
      .query({ from: '2026-09-01', to: '2026-09-30' })
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect((empty.body as { frequency: number }).frequency).toBe(0);
  });

  it('GET /students/:id/attendance rejects from > to', async () => {
    await request(app.getHttpServer())
      .get(`/students/${studentRow.id}/attendance`)
      .query({ from: '2026-09-30', to: '2026-09-01' })
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(400);
  });

  it('GET /students/:id/attendance returns 404 for missing student', async () => {
    prismaMock.student.count.mockResolvedValueOnce(0);

    await request(app.getHttpServer())
      .get(`/students/${studentRow.id}/attendance`)
      .query({ from: '2026-09-01', to: '2026-09-30' })
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);
  });

  it('rejects unauthenticated access to monthly-charges', async () => {
    await request(app.getHttpServer()).get('/monthly-charges').expect(401);
  });

  it('POST /monthly-charges creates charge copying monthlyFee', async () => {
    prismaMock.student.findUnique.mockResolvedValueOnce({
      id: studentRow.id,
      monthlyFee: new Prisma.Decimal(200),
      status: StudentStatus.ACTIVE,
    });

    const response = await request(app.getHttpServer())
      .post('/monthly-charges')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        studentId: studentRow.id,
        referenceMonth: '2026-09',
      })
      .expect(201);

    const body = response.body as { amount: number; status: string };
    expect(body.amount).toBe(200);
    expect(body.status).toBe('PENDING');
  });

  it('GET /monthly-charges lists charges', async () => {
    const response = await request(app.getHttpServer())
      .get('/monthly-charges')
      .query({ studentId: studentRow.id, referenceMonth: '2026-09' })
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
  });

  it('POST /monthly-charges/generate is idempotent for existing charges', async () => {
    prismaMock.student.findMany.mockResolvedValueOnce([
      { id: studentRow.id, monthlyFee: new Prisma.Decimal(200) },
    ]);
    prismaMock.monthlyCharge.findMany.mockResolvedValueOnce([{ studentId: studentRow.id }]);

    const response = await request(app.getHttpServer())
      .post('/monthly-charges/generate')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ referenceMonth: '2026-09' })
      .expect(200);

    const body = response.body as { created: number; alreadyExisted: number };
    expect(body.created).toBe(0);
    expect(body.alreadyExisted).toBe(1);
  });

  it('POST /monthly-charges/:id/pay and unpay', async () => {
    prismaMock.monthlyCharge.findUnique.mockResolvedValueOnce(monthlyChargeRow);
    prismaMock.monthlyCharge.update.mockResolvedValueOnce({
      ...monthlyChargeRow,
      status: MonthlyChargeStatus.PAID,
      paidAt: now,
    });

    const paid = await request(app.getHttpServer())
      .post(`/monthly-charges/${monthlyChargeRow.id}/pay`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect((paid.body as { status: string }).status).toBe('PAID');

    prismaMock.monthlyCharge.findUnique.mockResolvedValueOnce({
      ...monthlyChargeRow,
      status: MonthlyChargeStatus.PAID,
      paidAt: now,
    });
    prismaMock.monthlyCharge.update.mockResolvedValueOnce({
      ...monthlyChargeRow,
      status: MonthlyChargeStatus.PENDING,
      paidAt: null,
    });

    const unpaid = await request(app.getHttpServer())
      .post(`/monthly-charges/${monthlyChargeRow.id}/unpay`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect((unpaid.body as { status: string; paidAt: string | null }).paidAt).toBeNull();
  });

  it('rejects paying CANCELLED charge', async () => {
    prismaMock.monthlyCharge.findUnique.mockResolvedValueOnce({
      ...monthlyChargeRow,
      status: MonthlyChargeStatus.CANCELLED,
    });

    await request(app.getHttpServer())
      .post(`/monthly-charges/${monthlyChargeRow.id}/pay`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(400);
  });
});
