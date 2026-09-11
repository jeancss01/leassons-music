import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Weekday } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';

export class CreateScheduleDto {
  @ApiProperty({ enum: Weekday, example: Weekday.MONDAY })
  @IsEnum(Weekday)
  weekday!: Weekday;

  @ApiProperty({ example: '14:30', description: 'Time only HH:mm or HH:mm:ss' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, {
    message: 'startTime must be HH:mm or HH:mm:ss',
  })
  startTime!: string;

  @ApiProperty({ example: 60 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationMinutes!: number;

  @ApiProperty({ example: '2026-01-15', description: 'ISO date YYYY-MM-DD' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  validFrom!: string;

  @ApiPropertyOptional({ example: '2026-12-31', nullable: true })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  validUntil?: string | null;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
