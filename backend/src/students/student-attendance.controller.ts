import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AttendanceService } from './attendance.service';
import { AttendanceQueryDto } from './dto/attendance-query.dto';
import { AttendanceResponseDto } from './dto/attendance-response.dto';

@ApiTags('attendance')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
@UseGuards(JwtAuthGuard)
@Controller('students/:id/attendance')
export class StudentAttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get()
  @ApiOperation({
    summary: 'Student attendance frequency derived from lessons',
    description:
      'No Attendance entity. frequency = completed / (completed + noShow) as a decimal in [0, 1]. Default period is the current month in America/Sao_Paulo (BR-039).',
  })
  @ApiOkResponse({ type: AttendanceResponseDto })
  getAttendance(
    @Param('id', ParseUUIDPipe) studentId: string,
    @Query() query: AttendanceQueryDto,
  ): Promise<AttendanceResponseDto> {
    return this.attendanceService.getForStudent(studentId, query);
  }
}
