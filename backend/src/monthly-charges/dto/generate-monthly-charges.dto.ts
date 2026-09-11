import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class GenerateMonthlyChargesDto {
  @ApiProperty({ example: '2026-09', description: 'Reference month YYYY-MM' })
  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'referenceMonth must be YYYY-MM',
  })
  referenceMonth!: string;
}
