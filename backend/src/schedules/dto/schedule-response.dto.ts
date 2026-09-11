import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Weekday } from '@prisma/client';

export class ScheduleResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  studentId!: string;

  @ApiProperty({ enum: Weekday })
  weekday!: Weekday;

  @ApiProperty({ example: '14:30:00' })
  startTime!: string;

  @ApiProperty({ example: 60 })
  durationMinutes!: number;

  @ApiProperty({ example: '2026-01-15' })
  validFrom!: string;

  @ApiPropertyOptional({ example: '2026-12-31', nullable: true })
  validUntil!: string | null;

  @ApiProperty()
  active!: boolean;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}
