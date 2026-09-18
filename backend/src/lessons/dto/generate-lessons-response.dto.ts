import { ApiProperty } from '@nestjs/swagger';

export class GenerateLessonsResponseDto {
  @ApiProperty({
    example: '2026-09-18',
    description: 'Inclusive start (today in America/Sao_Paulo)',
  })
  from!: string;

  @ApiProperty({
    example: '2026-12-18',
    description: 'Inclusive end (today + 3 calendar months)',
  })
  to!: string;

  @ApiProperty({ description: 'Active schedules considered in this run' })
  schedulesConsidered!: number;

  @ApiProperty({ description: 'REGULAR lessons created in this run' })
  created!: number;

  @ApiProperty({
    description: 'Candidate occurrences that already had a Lesson for the same schedule+date',
  })
  alreadyExisted!: number;
}
