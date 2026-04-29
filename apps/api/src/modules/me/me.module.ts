import { Module } from '@nestjs/common';
import { ClassesModule } from '../classes/classes.module';
import { AttendanceModule } from '../attendance/attendance.module';
import { MeController } from './me.controller';

@Module({
  imports: [ClassesModule, AttendanceModule],
  controllers: [MeController],
})
export class MeModule {}
