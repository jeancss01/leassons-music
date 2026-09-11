import { ApiProperty } from '@nestjs/swagger';

export class GenerateMonthlyChargesResponseDto {
  @ApiProperty({ example: '2026-09' })
  referenceMonth!: string;

  @ApiProperty({ description: 'ACTIVE students considered for generation' })
  activeStudents!: number;

  @ApiProperty({ description: 'Charges created in this run' })
  created!: number;

  @ApiProperty({ description: 'ACTIVE students that already had a charge for the month' })
  alreadyExisted!: number;

  @ApiProperty({ type: [String], description: 'Student IDs that received a new charge' })
  createdStudentIds!: string[];

  @ApiProperty({
    type: [String],
    description: 'Student IDs skipped because a charge already existed',
  })
  skippedStudentIds!: string[];
}
