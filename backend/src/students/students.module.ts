import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AttendanceService } from './attendance.service';
import { StudentAttendanceController } from './student-attendance.controller';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';

@Module({
  imports: [AuthModule],
  controllers: [StudentsController, StudentAttendanceController],
  providers: [StudentsService, AttendanceService],
  exports: [StudentsService, AttendanceService],
})
export class StudentsModule {}
