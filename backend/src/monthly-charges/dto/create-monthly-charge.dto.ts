import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, Matches } from 'class-validator';

export class CreateMonthlyChargeDto {
  @ApiProperty()
  @IsUUID()
  studentId!: string;

  @ApiProperty({ example: '2026-09', description: 'Reference month YYYY-MM' })
  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'referenceMonth must be YYYY-MM',
  })
  referenceMonth!: string;

  @ApiPropertyOptional({ example: '2026-09-10', description: 'Due date YYYY-MM-DD' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dueDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
