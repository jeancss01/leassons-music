import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { ScheduleResponseDto } from './dto/schedule-response.dto';
import { SchedulesService } from './schedules.service';

@ApiTags('schedules')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
@UseGuards(JwtAuthGuard)
@Controller('students/:id/schedule')
export class StudentSchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a recurring weekly schedule for a student' })
  @ApiCreatedResponse({ type: ScheduleResponseDto })
  @ApiNotFoundResponse({ description: 'Student not found' })
  create(
    @Param('id', ParseUUIDPipe) studentId: string,
    @Body() dto: CreateScheduleDto,
  ): Promise<ScheduleResponseDto> {
    return this.schedulesService.create(studentId, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List schedules for a student',
    description:
      'Returns all schedules for the student, including historical ones (validFrom/validUntil). Does not filter by active.',
  })
  @ApiOkResponse({ type: ScheduleResponseDto, isArray: true })
  @ApiNotFoundResponse({ description: 'Student not found' })
  findByStudent(@Param('id', ParseUUIDPipe) studentId: string): Promise<ScheduleResponseDto[]> {
    return this.schedulesService.findByStudent(studentId);
  }
}
