import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { EventBusModule } from '../event-bus/event-bus.module';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { WeeklyResetService } from './weekly-reset.service';

@Module({
  imports: [DatabaseModule, EventBusModule],
  controllers: [AttendanceController],
  providers: [AttendanceService, WeeklyResetService],
  exports: [AttendanceService, WeeklyResetService],
})
export class AttendanceModule {}
