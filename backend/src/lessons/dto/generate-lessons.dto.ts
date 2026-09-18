import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class GenerateLessonsDto {
  @ApiPropertyOptional({
    description:
      'When set, generate only for this student (must be ACTIVE). When omitted, all ACTIVE students.',
  })
  @IsOptional()
  @IsUUID()
  studentId?: string;
}
