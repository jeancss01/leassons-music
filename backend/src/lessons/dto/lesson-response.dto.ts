import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CancellationReason, LessonStatus, LessonType } from '@prisma/client';

export class LessonResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  studentId!: string;

  @ApiPropertyOptional({ nullable: true })
  scheduleId!: string | null;

  @ApiProperty({ example: '2026-09-15' })
  date!: string;

  @ApiProperty({ example: '14:30:00' })
  startTime!: string;

  @ApiProperty({ example: 60 })
  durationMinutes!: number;

  @ApiProperty({ enum: LessonType })
  type!: LessonType;

  @ApiProperty({ enum: LessonStatus })
  status!: LessonStatus;

  @ApiPropertyOptional({ enum: CancellationReason, nullable: true })
  cancellationReason!: CancellationReason | null;

  @ApiPropertyOptional({ nullable: true })
  content!: string | null;

  @ApiPropertyOptional({ nullable: true })
  exercises!: string | null;

  @ApiPropertyOptional({ nullable: true })
  observations!: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}
