import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { EventBusModule } from '../event-bus/event-bus.module';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';

@Module({
  imports: [DatabaseModule, EventBusModule],
  controllers: [AttendanceController],
  providers: [AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
