import { NotFoundException } from '@nestjs/common';
import { Prisma, StudentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StudentListStatusFilter } from './dto/list-students-query.dto';
import { StudentsService } from './students.service';

describe('StudentsService', () => {
  const now = new Date('2026-09-10T12:00:00.000Z');
  const studentRow = {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Maria Silva',
    email: 'maria@example.com',
    phone: null,
    startDate: new Date('2026-01-15T00:00:00.000Z'),
    monthlyFee: new Prisma.Decimal(200),
    status: StudentStatus.ACTIVE,
    notes: null,
    createdAt: now,
    updatedAt: now,
  };

  const create = jest.fn();
  const findMany = jest.fn();
  const findUnique = jest.fn();
  const update = jest.fn();
  const count = jest.fn();

  const prisma = {
    student: { create, findMany, findUnique, update, count },
  } as unknown as PrismaService;

  const service = new StudentsService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a student with required fields (BR-001, BR-005)', async () => {
    create.mockResolvedValue(studentRow);

    const result = await service.create({
      name: 'Maria Silva',
      startDate: '2026-01-15',
      monthlyFee: 200,
    });

    expect(create).toHaveBeenCalled();
    const calls = create.mock.calls as Array<
      [{ data: { name: string; status: StudentStatus; monthlyFee: Prisma.Decimal } }]
    >;
    const createArg = calls[0][0];
    expect(createArg.data.name).toBe('Maria Silva');
    expect(createArg.data.status).toBe(StudentStatus.ACTIVE);
    expect(Number(createArg.data.monthlyFee)).toBe(200);
    expect(result.monthlyFee).toBe(200);
    expect(result.startDate).toBe('2026-01-15');
    expect(result.status).toBe(StudentStatus.ACTIVE);
  });

  it('lists only ACTIVE students by default (BR-004)', async () => {
    findMany.mockResolvedValue([studentRow]);

    await service.findAll({});

    expect(findMany).toHaveBeenCalledWith({
      where: { status: StudentStatus.ACTIVE },
      orderBy: { name: 'asc' },
    });
  });

  it('lists all students when status=ALL', async () => {
    findMany.mockResolvedValue([studentRow]);

    await service.findAll({ status: StudentListStatusFilter.ALL });

    expect(findMany).toHaveBeenCalledWith({
      where: undefined,
      orderBy: { name: 'asc' },
    });
  });

  it('inactivates without deleting (BR-003, BR-006)', async () => {
    count.mockResolvedValue(1);
    update.mockResolvedValue({
      ...studentRow,
      status: StudentStatus.INACTIVE,
    });

    const result = await service.inactivate(studentRow.id);

    expect(update).toHaveBeenCalledWith({
      where: { id: studentRow.id },
      data: { status: StudentStatus.INACTIVE },
    });
    expect(result.status).toBe(StudentStatus.INACTIVE);
  });

  it('throws NotFound when student does not exist', async () => {
    findUnique.mockResolvedValue(null);

    await expect(service.findOne(studentRow.id)).rejects.toBeInstanceOf(NotFoundException);
  });
});
