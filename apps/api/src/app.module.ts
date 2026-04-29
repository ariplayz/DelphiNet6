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
import { EventBusModule } from './modules/event-bus/event-bus.module';
import { AuditModule } from './modules/audit/audit.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { GatewayModule } from './modules/gateway/gateway.module';
import { PageviewInterceptor } from './modules/analytics/pageview.interceptor';
import { TypedEventEmitter } from './modules/event-bus/typed-event-emitter.service';
import { SchoolsModule } from './modules/schools/schools.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    DatabaseModule,
    AuthModule,
    TenancyModule,
    EventBusModule,
    AuditModule,
    AnalyticsModule,
    GatewayModule,
    SchoolsModule,
    UsersModule,
    RolesModule,
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
    // Pageview tracking — runs after tenancy sets req.schoolId
    {
      provide: APP_INTERCEPTOR,
      useFactory: (events: TypedEventEmitter) => new PageviewInterceptor(events),
      inject: [TypedEventEmitter],
    },
  ],
})
export class AppModule {}
