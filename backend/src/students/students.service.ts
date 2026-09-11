import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, StudentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { ListStudentsQueryDto, StudentListStatusFilter } from './dto/list-students-query.dto';
import { StudentResponseDto } from './dto/student-response.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { parseDateOnly, toStudentResponse } from './student.mapper';

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateStudentDto): Promise<StudentResponseDto> {
    const student = await this.prisma.student.create({
      data: {
        name: dto.name.trim(),
        email: dto.email?.trim() || null,
        phone: dto.phone?.trim() || null,
        startDate: parseDateOnly(dto.startDate),
        monthlyFee: new Prisma.Decimal(dto.monthlyFee),
        notes: dto.notes?.trim() || null,
        status: dto.status ?? StudentStatus.ACTIVE,
      },
    });

    return toStudentResponse(student);
  }

  async findAll(query: ListStudentsQueryDto): Promise<StudentResponseDto[]> {
    const filter = query.status ?? StudentListStatusFilter.ACTIVE;

    const where =
      filter === StudentListStatusFilter.ALL ? undefined : { status: filter as StudentStatus };

    const students = await this.prisma.student.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    return students.map(toStudentResponse);
  }

  async findOne(id: string): Promise<StudentResponseDto> {
    const student = await this.prisma.student.findUnique({ where: { id } });
    if (!student) {
      throw new NotFoundException(`Student ${id} not found`);
    }
    return toStudentResponse(student);
  }

  async update(id: string, dto: UpdateStudentDto): Promise<StudentResponseDto> {
    await this.ensureExists(id);

    const data: Prisma.StudentUpdateInput = {};

    if (dto.name !== undefined) {
      data.name = dto.name.trim();
    }
    if (dto.email !== undefined) {
      data.email = dto.email === null ? null : dto.email.trim() || null;
    }
    if (dto.phone !== undefined) {
      data.phone = dto.phone === null ? null : dto.phone.trim() || null;
    }
    if (dto.startDate !== undefined) {
      data.startDate = parseDateOnly(dto.startDate);
    }
    if (dto.monthlyFee !== undefined) {
      data.monthlyFee = new Prisma.Decimal(dto.monthlyFee);
    }
    if (dto.notes !== undefined) {
      data.notes = dto.notes === null ? null : dto.notes.trim() || null;
    }
    if (dto.status !== undefined) {
      data.status = dto.status;
    }

    const student = await this.prisma.student.update({
      where: { id },
      data,
    });

    return toStudentResponse(student);
  }

  /** BR-003 / BR-006 — inactivate without deleting history. */
  async inactivate(id: string): Promise<StudentResponseDto> {
    return this.update(id, { status: StudentStatus.INACTIVE });
  }

  private async ensureExists(id: string): Promise<void> {
    const count = await this.prisma.student.count({ where: { id } });
    if (count === 0) {
      throw new NotFoundException(`Student ${id} not found`);
    }
  }
}
