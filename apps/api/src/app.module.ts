import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR, Reflector } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
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
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ClassesModule } from './modules/classes/classes.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { DormsModule } from './modules/dorms/dorms.module';
import { PreferencesModule } from './modules/preferences/preferences.module';
import { MeModule } from './modules/me/me.module';
import { SeminarsModule } from './modules/seminars/seminars.module';
import { EthicsModule } from './modules/ethics/ethics.module';
import { ProgramsModule } from './modules/programs/programs.module';
import { StandardsModule } from './modules/standards/standards.module';
import { RoutingModule } from './modules/routing/routing.module';
import { CollegeAppsModule } from './modules/college-apps/college-apps.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    ScheduleModule.forRoot(),
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
    DashboardModule,
    ClassesModule,
    AttendanceModule,
    DormsModule,
    PreferencesModule,
    MeModule,
    SeminarsModule,
    EthicsModule,
    ProgramsModule,
    StandardsModule,
    RoutingModule,
    CollegeAppsModule,
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
