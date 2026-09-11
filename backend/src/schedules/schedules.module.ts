import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SchedulesController } from './schedules.controller';
import { SchedulesService } from './schedules.service';
import { StudentSchedulesController } from './student-schedules.controller';

@Module({
  imports: [AuthModule],
  controllers: [StudentSchedulesController, SchedulesController],
  providers: [SchedulesService],
  exports: [SchedulesService],
})
export class SchedulesModule {}
