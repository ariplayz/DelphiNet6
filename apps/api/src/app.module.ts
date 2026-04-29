import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR, Reflector } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './modules/database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { TenancyModule } from './modules/tenancy/tenancy.module';
import { SessionGuard } from './modules/auth/session.guard';
import { PermissionGuard } from './modules/auth/permission.guard';
import { TenancyInterceptor } from './modules/tenancy/tenancy.interceptor';
import { PrismaService } from './modules/database/prisma.service';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    DatabaseModule,
    AuthModule,
    TenancyModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Rate limiting
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Session auth — runs first
    {
      provide: APP_GUARD,
      useFactory: (prisma: PrismaService, reflector: Reflector) =>
        new SessionGuard(prisma, reflector),
      inject: [PrismaService, Reflector],
    },
    // Permission check — runs after session guard sets req.user
    {
      provide: APP_GUARD,
      useFactory: (reflector: Reflector) => new PermissionGuard(reflector),
      inject: [Reflector],
    },
    // Tenancy — runs after guards, wraps handler in schoolId context
    {
      provide: APP_INTERCEPTOR,
      useFactory: (reflector: Reflector) => new TenancyInterceptor(reflector),
      inject: [Reflector],
    },
  ],
})
export class AppModule {}
