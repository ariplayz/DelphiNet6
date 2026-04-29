import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { EventBusModule } from '../event-bus/event-bus.module';
import { SeminarsController } from './seminars.controller';
import { SeminarsService } from './seminars.service';

@Module({
  imports: [DatabaseModule, EventBusModule],
  controllers: [SeminarsController],
  providers: [SeminarsService],
  exports: [SeminarsService],
})
export class SeminarsModule {}
