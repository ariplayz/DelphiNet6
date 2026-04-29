import { Global, Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuditListener } from './audit.listener';

@Global()
@Module({
  imports: [DatabaseModule],
  providers: [AuditListener],
})
export class AuditModule {}
