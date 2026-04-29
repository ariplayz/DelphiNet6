import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { EthicsController } from './ethics.controller';
import { EthicsService } from './ethics.service';

@Module({
  imports: [DatabaseModule],
  controllers: [EthicsController],
  providers: [EthicsService],
})
export class EthicsModule {}
