import { ApiProperty } from '@nestjs/swagger';
import { CancellationReason } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class CancelLessonDto {
  @ApiProperty({ enum: CancellationReason })
  @IsEnum(CancellationReason)
  cancellationReason!: CancellationReason;
}
