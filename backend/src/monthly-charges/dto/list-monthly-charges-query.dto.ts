import { ApiPropertyOptional } from '@nestjs/swagger';
import { MonthlyChargeStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID, Matches } from 'class-validator';

export class ListMonthlyChargesQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  studentId?: string;

  @ApiPropertyOptional({ example: '2026-09' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  referenceMonth?: string;

  @ApiPropertyOptional({ enum: MonthlyChargeStatus })
  @IsOptional()
  @IsEnum(MonthlyChargeStatus)
  status?: MonthlyChargeStatus;
}
