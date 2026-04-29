import { Module } from '@nestjs/common';
import { TenancyInterceptor } from './tenancy.interceptor';

@Module({
  providers: [TenancyInterceptor],
  exports: [TenancyInterceptor],
})
export class TenancyModule {}
