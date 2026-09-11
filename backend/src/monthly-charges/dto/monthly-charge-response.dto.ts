import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MonthlyChargeStatus } from '@prisma/client';

export class MonthlyChargeResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  studentId!: string;

  @ApiProperty({ example: '2026-09' })
  referenceMonth!: string;

  @ApiProperty({ example: 200, description: 'Copied from Student.monthlyFee at creation time' })
  amount!: number;

  @ApiPropertyOptional({ example: '2026-09-10', nullable: true })
  dueDate!: string | null;

  @ApiProperty({ enum: MonthlyChargeStatus })
  status!: MonthlyChargeStatus;

  @ApiPropertyOptional({ nullable: true })
  paidAt!: string | null;

  @ApiPropertyOptional({ nullable: true })
  notes!: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}
