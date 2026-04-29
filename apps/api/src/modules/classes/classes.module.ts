import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { EventBusModule } from '../event-bus/event-bus.module';
import { AttendanceModule } from '../attendance/attendance.module';
import { ClassesController } from './classes.controller';
import { ClassesService } from './classes.service';

@Module({
  imports: [DatabaseModule, EventBusModule, AttendanceModule],
  controllers: [ClassesController],
  providers: [ClassesService],
  exports: [ClassesService],
})
export class ClassesModule {}
