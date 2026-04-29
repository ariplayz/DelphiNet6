import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { CollegeAppsController } from './college-apps.controller';
import { CollegeAppsService } from './college-apps.service';

@Module({
  imports: [DatabaseModule],
  controllers: [CollegeAppsController],
  providers: [CollegeAppsService],
  exports: [CollegeAppsService],
})
export class CollegeAppsModule {}
