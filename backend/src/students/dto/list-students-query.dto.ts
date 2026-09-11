import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

export enum StudentListStatusFilter {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ALL = 'ALL',
}

export class ListStudentsQueryDto {
  @ApiPropertyOptional({
    enum: StudentListStatusFilter,
    default: StudentListStatusFilter.ACTIVE,
    description: 'Default ACTIVE (BR-004). Use ALL to include inactive students.',
  })
  @IsOptional()
  @IsEnum(StudentListStatusFilter)
  status?: StudentListStatusFilter = StudentListStatusFilter.ACTIVE;
}
