import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  CancellationReason,
  Lesson,
  LessonStatus,
  LessonType,
  Prisma,
  StudentStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CancelLessonDto } from './dto/cancel-lesson.dto';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { GenerateLessonsDto } from './dto/generate-lessons.dto';
import { GenerateLessonsResponseDto } from './dto/generate-lessons-response.dto';
import { LessonResponseDto } from './dto/lesson-response.dto';
import { ListLessonsQueryDto } from './dto/list-lessons-query.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import {
  effectiveGenerationRange,
  planningHorizonEnd,
  todaySaoPaulo,
  weeklyOccurrenceDates,
} from './lesson-generation';
import { formatDateOnly, parseDateOnly, parseTimeOnly, toLessonResponse } from './lesson.mapper';

@Injectable()
export class LessonsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateLessonDto): Promise<LessonResponseDto> {
    await this.ensureStudentExists(dto.studentId);

    const scheduleId = dto.scheduleId ?? null;
    if (scheduleId) {
      await this.ensureScheduleBelongsToStudent(scheduleId, dto.studentId);
    }

    const lesson = await this.prisma.lesson.create({
      data: {
        studentId: dto.studentId,
        scheduleId,
        date: parseDateOnly(dto.date),
        startTime: parseTimeOnly(dto.startTime),
        durationMinutes: dto.durationMinutes,
        type: dto.type,
        status: LessonStatus.SCHEDULED,
        cancellationReason: null,
        content: dto.content?.trim() || null,
        exercises: dto.exercises?.trim() || null,
        observations: dto.observations?.trim() || null,
      },
    });

    return toLessonResponse(lesson);
  }

  async generate(
    dto: GenerateLessonsDto,
    now: Date = new Date(),
  ): Promise<GenerateLessonsResponseDto> {
    const from = todaySaoPaulo(now);
    const to = planningHorizonEnd(from);

    if (dto.studentId) {
      const student = await this.prisma.student.findUnique({
        where: { id: dto.studentId },
        select: { id: true, status: true },
      });
      if (!student) {
        throw new NotFoundException(`Student ${dto.studentId} not found`);
      }
    }

    const schedules = await this.prisma.schedule.findMany({
      where: {
        active: true,
        student: {
          status: StudentStatus.ACTIVE,
          ...(dto.studentId ? { id: dto.studentId } : {}),
        },
      },
      select: {
        id: true,
        studentId: true,
        weekday: true,
        startTime: true,
        durationMinutes: true,
        validFrom: true,
        validUntil: true,
      },
      orderBy: { id: 'asc' },
    });

    const candidates: Prisma.LessonCreateManyInput[] = [];

    for (const schedule of schedules) {
      const range = effectiveGenerationRange({
        todayIso: from,
        horizonEndIso: to,
        validFromIso: formatDateOnly(schedule.validFrom),
        validUntilIso: schedule.validUntil ? formatDateOnly(schedule.validUntil) : null,
      });
      if (!range) {
        continue;
      }

      const dates = weeklyOccurrenceDates(schedule.weekday, range.from, range.to);
      for (const date of dates) {
        candidates.push({
          studentId: schedule.studentId,
          scheduleId: schedule.id,
          date: parseDateOnly(date),
          startTime: schedule.startTime,
          durationMinutes: schedule.durationMinutes,
          type: LessonType.REGULAR,
          status: LessonStatus.SCHEDULED,
          cancellationReason: null,
          content: null,
          exercises: null,
          observations: null,
        });
      }
    }

    if (candidates.length === 0) {
      return {
        from,
        to,
        schedulesConsidered: schedules.length,
        created: 0,
        alreadyExisted: 0,
      };
    }

    const result = await this.prisma.lesson.createMany({
      data: candidates,
      skipDuplicates: true,
    });

    return {
      from,
      to,
      schedulesConsidered: schedules.length,
      created: result.count,
      alreadyExisted: candidates.length - result.count,
    };
  }

  async findAll(query: ListLessonsQueryDto): Promise<LessonResponseDto[]> {
    const where: Prisma.LessonWhereInput = {};

    if (query.studentId) {
      where.studentId = query.studentId;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.from || query.to) {
      where.date = {};
      if (query.from) {
        where.date.gte = parseDateOnly(query.from);
      }
      if (query.to) {
        where.date.lte = parseDateOnly(query.to);
      }
    }

    const lessons = await this.prisma.lesson.findMany({
      where,
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    return lessons.map(toLessonResponse);
  }

  async findOne(id: string): Promise<LessonResponseDto> {
    return toLessonResponse(await this.getLessonOrThrow(id));
  }

  async update(id: string, dto: UpdateLessonDto): Promise<LessonResponseDto> {
    const existing = await this.getLessonOrThrow(id);

    if (dto.scheduleId) {
      await this.ensureScheduleBelongsToStudent(dto.scheduleId, existing.studentId);
    }

    const data: Prisma.LessonUpdateInput = {};

    if (dto.scheduleId !== undefined) {
      data.schedule =
        dto.scheduleId === null ? { disconnect: true } : { connect: { id: dto.scheduleId } };
    }
    if (dto.date !== undefined) {
      data.date = parseDateOnly(dto.date);
    }
    if (dto.startTime !== undefined) {
      data.startTime = parseTimeOnly(dto.startTime);
    }
    if (dto.durationMinutes !== undefined) {
      data.durationMinutes = dto.durationMinutes;
    }
    if (dto.type !== undefined) {
      data.type = dto.type;
    }
    if (dto.content !== undefined) {
      data.content = dto.content === null ? null : dto.content.trim() || null;
    }
    if (dto.exercises !== undefined) {
      data.exercises = dto.exercises === null ? null : dto.exercises.trim() || null;
    }
    if (dto.observations !== undefined) {
      data.observations = dto.observations === null ? null : dto.observations.trim() || null;
    }

    // Updates only this Lesson — never mutates Schedule or other lessons.
    const lesson = await this.prisma.lesson.update({
      where: { id },
      data,
    });

    return toLessonResponse(lesson);
  }

  async complete(id: string): Promise<LessonResponseDto> {
    return this.transition(id, LessonStatus.COMPLETED);
  }

  async noShow(id: string): Promise<LessonResponseDto> {
    return this.transition(id, LessonStatus.NO_SHOW);
  }

  async cancel(id: string, dto: CancelLessonDto): Promise<LessonResponseDto> {
    return this.transition(id, LessonStatus.CANCELLED, dto.cancellationReason);
  }

  private async transition(
    id: string,
    nextStatus: LessonStatus,
    cancellationReason?: CancellationReason,
  ): Promise<LessonResponseDto> {
    const existing = await this.getLessonOrThrow(id);

    if (existing.status !== LessonStatus.SCHEDULED) {
      throw new BadRequestException(
        `Cannot transition lesson from ${existing.status} to ${nextStatus}`,
      );
    }

    if (nextStatus === LessonStatus.CANCELLED && !cancellationReason) {
      throw new BadRequestException('cancellationReason is required to cancel a lesson');
    }

    const lesson = await this.prisma.lesson.update({
      where: { id },
      data: {
        status: nextStatus,
        cancellationReason: nextStatus === LessonStatus.CANCELLED ? cancellationReason : null,
      },
    });

    return toLessonResponse(lesson);
  }

  private async getLessonOrThrow(id: string): Promise<Lesson> {
    const lesson = await this.prisma.lesson.findUnique({ where: { id } });
    if (!lesson) {
      throw new NotFoundException(`Lesson ${id} not found`);
    }
    return lesson;
  }

  private async ensureStudentExists(studentId: string): Promise<void> {
    const count = await this.prisma.student.count({ where: { id: studentId } });
    if (count === 0) {
      throw new NotFoundException(`Student ${studentId} not found`);
    }
  }

  private async ensureScheduleBelongsToStudent(
    scheduleId: string,
    studentId: string,
  ): Promise<void> {
    const schedule = await this.prisma.schedule.findUnique({
      where: { id: scheduleId },
      select: { studentId: true },
    });
    if (!schedule) {
      throw new NotFoundException(`Schedule ${scheduleId} not found`);
    }
    if (schedule.studentId !== studentId) {
      throw new BadRequestException('Schedule does not belong to the lesson student');
    }
  }
}
