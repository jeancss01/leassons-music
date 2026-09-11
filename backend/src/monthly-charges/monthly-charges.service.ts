import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MonthlyCharge, MonthlyChargeStatus, Prisma, StudentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMonthlyChargeDto } from './dto/create-monthly-charge.dto';
import { GenerateMonthlyChargesDto } from './dto/generate-monthly-charges.dto';
import { GenerateMonthlyChargesResponseDto } from './dto/generate-monthly-charges-response.dto';
import { ListMonthlyChargesQueryDto } from './dto/list-monthly-charges-query.dto';
import { MonthlyChargeResponseDto } from './dto/monthly-charge-response.dto';
import { UpdateMonthlyChargeDto } from './dto/update-monthly-charge.dto';
import { parseDateOnly, toMonthlyChargeResponse } from './monthly-charge.mapper';

@Injectable()
export class MonthlyChargesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateMonthlyChargeDto): Promise<MonthlyChargeResponseDto> {
    const student = await this.prisma.student.findUnique({ where: { id: dto.studentId } });
    if (!student) {
      throw new NotFoundException(`Student ${dto.studentId} not found`);
    }

    try {
      const charge = await this.prisma.monthlyCharge.create({
        data: {
          studentId: dto.studentId,
          referenceMonth: dto.referenceMonth,
          amount: student.monthlyFee,
          dueDate: dto.dueDate ? parseDateOnly(dto.dueDate) : null,
          notes: dto.notes?.trim() || null,
          status: MonthlyChargeStatus.PENDING,
          paidAt: null,
        },
      });
      return toMonthlyChargeResponse(charge);
    } catch (error) {
      this.rethrowUniqueConflict(error, dto.studentId, dto.referenceMonth);
      throw error;
    }
  }

  async findAll(query: ListMonthlyChargesQueryDto): Promise<MonthlyChargeResponseDto[]> {
    const where: Prisma.MonthlyChargeWhereInput = {};
    if (query.studentId) {
      where.studentId = query.studentId;
    }
    if (query.referenceMonth) {
      where.referenceMonth = query.referenceMonth;
    }
    if (query.status) {
      where.status = query.status;
    }

    const charges = await this.prisma.monthlyCharge.findMany({
      where,
      orderBy: [{ referenceMonth: 'desc' }, { studentId: 'asc' }],
    });

    return charges.map(toMonthlyChargeResponse);
  }

  async findOne(id: string): Promise<MonthlyChargeResponseDto> {
    return toMonthlyChargeResponse(await this.getOrThrow(id));
  }

  async update(id: string, dto: UpdateMonthlyChargeDto): Promise<MonthlyChargeResponseDto> {
    await this.getOrThrow(id);

    const data: Prisma.MonthlyChargeUpdateInput = {};
    if (dto.dueDate !== undefined) {
      data.dueDate = dto.dueDate === null ? null : parseDateOnly(dto.dueDate);
    }
    if (dto.notes !== undefined) {
      data.notes = dto.notes === null ? null : dto.notes.trim() || null;
    }

    const charge = await this.prisma.monthlyCharge.update({
      where: { id },
      data,
    });

    return toMonthlyChargeResponse(charge);
  }

  async pay(id: string): Promise<MonthlyChargeResponseDto> {
    const existing = await this.getOrThrow(id);

    if (existing.status === MonthlyChargeStatus.CANCELLED) {
      throw new BadRequestException('Cannot pay a CANCELLED monthly charge');
    }
    if (existing.status === MonthlyChargeStatus.PAID) {
      throw new BadRequestException('Monthly charge is already PAID');
    }

    const charge = await this.prisma.monthlyCharge.update({
      where: { id },
      data: {
        status: MonthlyChargeStatus.PAID,
        paidAt: new Date(),
      },
    });

    return toMonthlyChargeResponse(charge);
  }

  async unpay(id: string): Promise<MonthlyChargeResponseDto> {
    const existing = await this.getOrThrow(id);

    if (existing.status !== MonthlyChargeStatus.PAID) {
      throw new BadRequestException('Only PAID monthly charges can be unpaid');
    }

    const charge = await this.prisma.monthlyCharge.update({
      where: { id },
      data: {
        status: MonthlyChargeStatus.PENDING,
        paidAt: null,
      },
    });

    return toMonthlyChargeResponse(charge);
  }

  async generate(dto: GenerateMonthlyChargesDto): Promise<GenerateMonthlyChargesResponseDto> {
    const activeStudents = await this.prisma.student.findMany({
      where: { status: StudentStatus.ACTIVE },
      select: { id: true, monthlyFee: true },
      orderBy: { id: 'asc' },
    });

    const existing = await this.prisma.monthlyCharge.findMany({
      where: {
        referenceMonth: dto.referenceMonth,
        studentId: { in: activeStudents.map((student) => student.id) },
      },
      select: { studentId: true },
    });

    const existingIds = new Set(existing.map((charge) => charge.studentId));
    const createdStudentIds: string[] = [];
    const skippedStudentIds: string[] = [];

    for (const student of activeStudents) {
      if (existingIds.has(student.id)) {
        skippedStudentIds.push(student.id);
        continue;
      }

      await this.prisma.monthlyCharge.create({
        data: {
          studentId: student.id,
          referenceMonth: dto.referenceMonth,
          amount: student.monthlyFee,
          status: MonthlyChargeStatus.PENDING,
          paidAt: null,
        },
      });
      createdStudentIds.push(student.id);
    }

    return {
      referenceMonth: dto.referenceMonth,
      activeStudents: activeStudents.length,
      created: createdStudentIds.length,
      alreadyExisted: skippedStudentIds.length,
      createdStudentIds,
      skippedStudentIds,
    };
  }

  private async getOrThrow(id: string): Promise<MonthlyCharge> {
    const charge = await this.prisma.monthlyCharge.findUnique({ where: { id } });
    if (!charge) {
      throw new NotFoundException(`MonthlyCharge ${id} not found`);
    }
    return charge;
  }

  private rethrowUniqueConflict(error: unknown, studentId: string, referenceMonth: string): void {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException(
        `Monthly charge already exists for student ${studentId} and month ${referenceMonth}`,
      );
    }
  }
}
