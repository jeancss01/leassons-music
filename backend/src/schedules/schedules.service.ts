import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { ScheduleResponseDto } from './dto/schedule-response.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import {
  assertValidDateRange,
  parseDateOnly,
  parseTimeOnly,
  toScheduleResponse,
} from './schedule.mapper';

@Injectable()
export class SchedulesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(studentId: string, dto: CreateScheduleDto): Promise<ScheduleResponseDto> {
    await this.ensureStudentExists(studentId);

    const validFrom = parseDateOnly(dto.validFrom);
    const validUntil =
      dto.validUntil === undefined || dto.validUntil === null
        ? null
        : parseDateOnly(dto.validUntil);

    assertValidDateRange(validFrom, validUntil);

    const schedule = await this.prisma.schedule.create({
      data: {
        studentId,
        weekday: dto.weekday,
        startTime: parseTimeOnly(dto.startTime),
        durationMinutes: dto.durationMinutes,
        validFrom,
        validUntil,
        active: dto.active ?? true,
      },
    });

    return toScheduleResponse(schedule);
  }

  async findByStudent(studentId: string): Promise<ScheduleResponseDto[]> {
    await this.ensureStudentExists(studentId);

    const schedules = await this.prisma.schedule.findMany({
      where: { studentId },
      orderBy: [{ weekday: 'asc' }, { startTime: 'asc' }, { validFrom: 'asc' }],
    });

    return schedules.map(toScheduleResponse);
  }

  async update(id: string, dto: UpdateScheduleDto): Promise<ScheduleResponseDto> {
    const existing = await this.prisma.schedule.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Schedule ${id} not found`);
    }

    const nextValidFrom =
      dto.validFrom !== undefined ? parseDateOnly(dto.validFrom) : existing.validFrom;

    let nextValidUntil = existing.validUntil;
    if (dto.validUntil !== undefined) {
      nextValidUntil = dto.validUntil === null ? null : parseDateOnly(dto.validUntil);
    }

    assertValidDateRange(nextValidFrom, nextValidUntil);

    const data: Prisma.ScheduleUpdateInput = {};

    if (dto.weekday !== undefined) {
      data.weekday = dto.weekday;
    }
    if (dto.startTime !== undefined) {
      data.startTime = parseTimeOnly(dto.startTime);
    }
    if (dto.durationMinutes !== undefined) {
      data.durationMinutes = dto.durationMinutes;
    }
    if (dto.validFrom !== undefined) {
      data.validFrom = nextValidFrom;
    }
    if (dto.validUntil !== undefined) {
      data.validUntil = nextValidUntil;
    }
    if (dto.active !== undefined) {
      data.active = dto.active;
    }

    // Updates only the Schedule row — does not touch Lesson records (BR-012 reverse / immutability).
    const schedule = await this.prisma.schedule.update({
      where: { id },
      data,
    });

    return toScheduleResponse(schedule);
  }

  private async ensureStudentExists(studentId: string): Promise<void> {
    const count = await this.prisma.student.count({ where: { id: studentId } });
    if (count === 0) {
      throw new NotFoundException(`Student ${studentId} not found`);
    }
  }
}
