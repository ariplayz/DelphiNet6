import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AnalyticsListener } from './analytics.listener';
import { AnalyticsController } from './analytics.controller';

@Module({
  imports: [DatabaseModule],
  providers: [AnalyticsListener],
  controllers: [AnalyticsController],
})
export class AnalyticsModule {}
