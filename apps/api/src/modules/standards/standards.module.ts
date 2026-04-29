import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { StandardsController } from './standards.controller';
import { StandardsService } from './standards.service';

@Module({
  imports: [DatabaseModule],
  controllers: [StandardsController],
  providers: [StandardsService],
  exports: [StandardsService],
})
export class StandardsModule {}
