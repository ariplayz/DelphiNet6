import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { EventBusModule } from '../event-bus/event-bus.module';
import {
  DormRollCallController,
  DormsController,
} from './dorms.controller';
import { DormsService } from './dorms.service';

@Module({
  imports: [DatabaseModule, EventBusModule],
  controllers: [DormsController, DormRollCallController],
  providers: [DormsService],
  exports: [DormsService],
})
export class DormsModule {}
