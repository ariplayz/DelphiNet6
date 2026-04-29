import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { SchoolContextStorage } from '../tenancy/school-context.storage';

/** Models that are global or don't carry a tenant schoolId column. */
const SKIP_TENANCY = new Set([
  'School',
  'Session',
  'Role',
  'RolePermission',
  'UserRole',
  'Permission',
  'WidgetLayout',
  'QuickLink',
  'ClassSession',
  'ClassEnrollment',
  'RollCall',
  'AttendanceEntry',
  'DormRoom',
  'DormAssignment',
  'DormRollCallSchedule',
  'Checksheet',
  'BookRead',
  'ParentLink',
  'UserPreference',
  'SeminarEnrollment',
  'SeminarSession',
  'SeminarAttendance',
]);

/** Models that have a schoolId column and should be auto-filtered. */
const TENANTED_MODELS = new Set([
  'User',
  'AuditLog',
  'Pageview',
  'Class',
  'WeeklyPointSnapshot',
  'Dorm',
  'DormRollCallSlot',
  'ProgramTemplate',
  'Program',
  'SuccessStory',
  'CramAssignment',
  'EthicsReport',
  'RoutingForm',
  'CollegeApplication',
  'ReferencePage',
  'Seminar',
]);

const READ_OPERATIONS = new Set([
  'findMany',
  'findFirst',
  'findFirstOrThrow',
  'aggregate',
  'count',
  'groupBy',
]);

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this as any).$use(async (params: any, next: (p: any) => Promise<unknown>) => {
      const schoolId = SchoolContextStorage.getStore()?.schoolId;

      if (!schoolId || !params.model || SKIP_TENANCY.has(params.model) || !TENANTED_MODELS.has(params.model)) {
        return next(params);
      }

      if (READ_OPERATIONS.has(params.action)) {
        params.args ??= {};
        params.args.where ??= {};
        if (!params.args.where.schoolId) {
          params.args.where.schoolId = schoolId;
        }
      } else if (params.action === 'create') {
        params.args ??= {};
        params.args.data ??= {};
        if (!params.args.data.schoolId) {
          params.args.data.schoolId = schoolId;
        }
      }

      return next(params);
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
