import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { MonthlyChargeStatus, Prisma, StudentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MonthlyChargesService } from './monthly-charges.service';

describe('MonthlyChargesService', () => {
  const now = new Date('2026-09-10T12:00:00.000Z');
  const studentId = '11111111-1111-4111-8111-111111111111';
  const secondActiveId = '66666666-6666-4666-8666-666666666666';
  const chargeId = '55555555-5555-4555-8555-555555555555';

  const studentRow = {
    id: studentId,
    monthlyFee: new Prisma.Decimal(200),
    status: StudentStatus.ACTIVE,
  };

  const chargeRow = {
    id: chargeId,
    studentId,
    referenceMonth: '2026-09',
    amount: new Prisma.Decimal(200),
    dueDate: null as Date | null,
    status: MonthlyChargeStatus.PENDING,
    paidAt: null as Date | null,
    notes: null as string | null,
    createdAt: now,
    updatedAt: now,
  };

  const studentFindUnique = jest.fn();
  const studentFindMany = jest.fn();
  const chargeCreate = jest.fn();
  const chargeFindMany = jest.fn();
  const chargeFindUnique = jest.fn();
  const chargeUpdate = jest.fn();
  const lessonCreate = jest.fn();
  const lessonUpdate = jest.fn();

  const prisma = {
    student: {
      findUnique: studentFindUnique,
      findMany: studentFindMany,
    },
    monthlyCharge: {
      create: chargeCreate,
      findMany: chargeFindMany,
      findUnique: chargeFindUnique,
      update: chargeUpdate,
    },
    lesson: {
      create: lessonCreate,
      update: lessonUpdate,
    },
  } as unknown as PrismaService;

  const service = new MonthlyChargesService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a charge copying monthlyFee', async () => {
    studentFindUnique.mockResolvedValue(studentRow);
    chargeCreate.mockResolvedValue(chargeRow);

    const result = await service.create({
      studentId,
      referenceMonth: '2026-09',
    });

    expect(chargeCreate).toHaveBeenCalled();
    const createArg = (
      chargeCreate.mock.calls as Array<
        [{ data: { amount: Prisma.Decimal; status: MonthlyChargeStatus } }]
      >
    )[0][0];
    expect(Number(createArg.data.amount)).toBe(200);
    expect(createArg.data.status).toBe(MonthlyChargeStatus.PENDING);
    expect(result.amount).toBe(200);
    expect(lessonCreate).not.toHaveBeenCalled();
  });

  it('rejects create when student does not exist', async () => {
    studentFindUnique.mockResolvedValue(null);

    await expect(service.create({ studentId, referenceMonth: '2026-09' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects duplicate student/month', async () => {
    studentFindUnique.mockResolvedValue(studentRow);
    const error = new Prisma.PrismaClientKnownRequestError('Unique constraint', {
      code: 'P2002',
      clientVersion: 'test',
    });
    chargeCreate.mockRejectedValue(error);

    await expect(service.create({ studentId, referenceMonth: '2026-09' })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('keeps existing amount when student monthlyFee changes later', async () => {
    chargeFindUnique.mockResolvedValue(chargeRow);

    const result = await service.findOne(chargeId);

    expect(result.amount).toBe(200);
    expect(chargeUpdate).not.toHaveBeenCalled();
  });

  it('pays and unpays a charge without touching lessons', async () => {
    chargeFindUnique.mockResolvedValue(chargeRow);
    chargeUpdate.mockResolvedValueOnce({
      ...chargeRow,
      status: MonthlyChargeStatus.PAID,
      paidAt: now,
    });

    const paid = await service.pay(chargeId);
    expect(paid.status).toBe(MonthlyChargeStatus.PAID);
    expect(paid.paidAt).toBe(now.toISOString());
    expect(lessonUpdate).not.toHaveBeenCalled();

    chargeFindUnique.mockResolvedValue({
      ...chargeRow,
      status: MonthlyChargeStatus.PAID,
      paidAt: now,
    });
    chargeUpdate.mockResolvedValueOnce({
      ...chargeRow,
      status: MonthlyChargeStatus.PENDING,
      paidAt: null,
    });

    const unpaid = await service.unpay(chargeId);
    expect(unpaid.status).toBe(MonthlyChargeStatus.PENDING);
    expect(unpaid.paidAt).toBeNull();
  });

  it('rejects paying a CANCELLED charge', async () => {
    chargeFindUnique.mockResolvedValue({
      ...chargeRow,
      status: MonthlyChargeStatus.CANCELLED,
    });

    await expect(service.pay(chargeId)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('generates charges for ACTIVE students only, idempotently', async () => {
    const secondActive = {
      id: secondActiveId,
      monthlyFee: new Prisma.Decimal(180),
    };
    studentFindMany.mockResolvedValue([studentRow, secondActive]);
    chargeFindMany.mockResolvedValue([{ studentId }]);
    chargeCreate.mockResolvedValue({
      ...chargeRow,
      id: '77777777-7777-4777-8777-777777777777',
      studentId: secondActive.id,
      amount: secondActive.monthlyFee,
    });

    const result = await service.generate({ referenceMonth: '2026-09' });

    expect(studentFindMany).toHaveBeenCalledWith({
      where: { status: StudentStatus.ACTIVE },
      select: { id: true, monthlyFee: true },
      orderBy: { id: 'asc' },
    });
    expect(result.created).toBe(1);
    expect(result.alreadyExisted).toBe(1);
    expect(result.createdStudentIds).toEqual([secondActive.id]);
    expect(result.skippedStudentIds).toEqual([studentId]);
    expect(
      Number(
        (chargeCreate.mock.calls as Array<[{ data: { amount: Prisma.Decimal } }]>)[0][0].data
          .amount,
      ),
    ).toBe(180);
    expect(lessonCreate).not.toHaveBeenCalled();
  });

  it('lists with filters', async () => {
    chargeFindMany.mockResolvedValue([chargeRow]);

    await service.findAll({
      studentId,
      referenceMonth: '2026-09',
      status: MonthlyChargeStatus.PENDING,
    });

    expect(chargeFindMany).toHaveBeenCalledWith({
      where: {
        studentId,
        referenceMonth: '2026-09',
        status: MonthlyChargeStatus.PENDING,
      },
      orderBy: [{ referenceMonth: 'desc' }, { studentId: 'asc' }],
    });
  });

  it('updates dueDate/notes only', async () => {
    chargeFindUnique.mockResolvedValue(chargeRow);
    chargeUpdate.mockResolvedValue({
      ...chargeRow,
      notes: 'ok',
      dueDate: new Date('2026-09-10T00:00:00.000Z'),
    });

    const result = await service.update(chargeId, {
      notes: 'ok',
      dueDate: '2026-09-10',
    });

    expect(result.notes).toBe('ok');
    expect(result.dueDate).toBe('2026-09-10');
    expect(result.status).toBe(MonthlyChargeStatus.PENDING);
  });
});
