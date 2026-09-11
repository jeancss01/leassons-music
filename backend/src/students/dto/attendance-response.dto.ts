import { ApiProperty } from '@nestjs/swagger';

export class AttendanceResponseDto {
  @ApiProperty()
  studentId!: string;

  @ApiProperty({ example: '2026-09-01' })
  from!: string;

  @ApiProperty({ example: '2026-09-30' })
  to!: string;

  @ApiProperty({ description: 'Lessons with status COMPLETED (any type)' })
  completed!: number;

  @ApiProperty({ description: 'Lessons with status NO_SHOW' })
  noShow!: number;

  @ApiProperty({ description: 'Lessons with status CANCELLED (excluded from frequency)' })
  cancelled!: number;

  @ApiProperty({ description: 'completed + noShow' })
  totalConsidered!: number;

  @ApiProperty({
    example: 0.75,
    description:
      'Decimal in [0, 1]: completed / (completed + noShow). Returns 0 when totalConsidered is 0.',
  })
  frequency!: number;
}
