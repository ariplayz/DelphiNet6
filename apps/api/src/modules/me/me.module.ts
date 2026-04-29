import { Module } from '@nestjs/common';
import { ClassesModule } from '../classes/classes.module';
import { AttendanceModule } from '../attendance/attendance.module';
import { DatabaseModule } from '../database/database.module';
import { MeController } from './me.controller';

@Module({
  imports: [ClassesModule, AttendanceModule, DatabaseModule],
  controllers: [MeController],
})
export class MeModule {}
