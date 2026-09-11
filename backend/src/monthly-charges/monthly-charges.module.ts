import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MonthlyChargesController } from './monthly-charges.controller';
import { MonthlyChargesService } from './monthly-charges.service';

@Module({
  imports: [AuthModule],
  controllers: [MonthlyChargesController],
  providers: [MonthlyChargesService],
  exports: [MonthlyChargesService],
})
export class MonthlyChargesModule {}
