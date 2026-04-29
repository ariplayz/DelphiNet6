import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { ClassesModule } from '../classes/classes.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [DatabaseModule, ClassesModule],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
