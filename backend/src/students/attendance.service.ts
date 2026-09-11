import { Injectable, NotFoundException } from '@nestjs/common';
import { LessonStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { parseDateOnly } from '../lessons/lesson.mapper';
import { AttendanceQueryDto } from './dto/attendance-query.dto';
import { AttendanceResponseDto } from './dto/attendance-response.dto';
import { computeFrequency, resolveAttendancePeriod } from './attendance.math';

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  async getForStudent(
    studentId: string,
    query: AttendanceQueryDto,
  ): Promise<AttendanceResponseDto> {
    await this.ensureStudentExists(studentId);

    const { from, to } = resolveAttendancePeriod(query.from, query.to);

    const lessons = await this.prisma.lesson.findMany({
      where: {
        studentId,
        date: {
          gte: parseDateOnly(from),
          lte: parseDateOnly(to),
        },
      },
      select: { status: true },
    });

    let completed = 0;
    let noShow = 0;
    let cancelled = 0;

    for (const lesson of lessons) {
      if (lesson.status === LessonStatus.COMPLETED) {
        completed += 1;
      } else if (lesson.status === LessonStatus.NO_SHOW) {
        noShow += 1;
      } else if (lesson.status === LessonStatus.CANCELLED) {
        cancelled += 1;
      }
    }

    const totalConsidered = completed + noShow;

    return {
      studentId,
      from,
      to,
      completed,
      noShow,
      cancelled,
      totalConsidered,
      frequency: computeFrequency(completed, noShow),
    };
  }

  private async ensureStudentExists(studentId: string): Promise<void> {
    const count = await this.prisma.student.count({ where: { id: studentId } });
    if (count === 0) {
      throw new NotFoundException(`Student ${studentId} not found`);
    }
  }
}
