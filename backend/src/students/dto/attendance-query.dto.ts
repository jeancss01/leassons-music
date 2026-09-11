import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';

export class AttendanceQueryDto {
  @ApiPropertyOptional({
    example: '2026-09-01',
    description:
      'Inclusive start date (YYYY-MM-DD). When omitted with `to`, defaults to current month in America/Sao_Paulo (BR-039). If one of from/to is sent, both are required.',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from?: string;

  @ApiPropertyOptional({
    example: '2026-09-30',
    description: 'Inclusive end date (YYYY-MM-DD). See `from`.',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to?: string;
}
