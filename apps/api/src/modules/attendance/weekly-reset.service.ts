import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { TypedEventEmitter } from '../event-bus/typed-event-emitter.service';
import { RESTRICTION_THRESHOLD } from './attendance.constants';
import {
  getCurrentWeekStart,
  getNextWeekStart,
  getWeekStartInTimeZone,
} from './attendance.week';

const SCHOOL_TZ = process.env.SCHOOL_TIMEZONE || 'America/Los_Angeles';

@Injectable()
export class WeeklyResetService {
  private readonly logger = new Logger(WeeklyResetService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: TypedEventEmitter,
  ) {}

  /**
   * Tuesday 00:00 in the configured school timezone. Per-school timezones are
   * additionally honoured inside {@link runWeeklyReset}.
   */
  @Cron('0 0 * * 2', { timeZone: SCHOOL_TZ })
  async cron() {
    this.logger.log('Weekly attendance reset cron firing');
    const result = await this.runWeeklyReset();
    this.logger.log(
      `Weekly attendance reset done for ${result.length} school(s)`,
    );
  }

  /**
   * Snapshot the just-finished week for every school. Returns one entry per
   * school with the number of snapshot rows written.
   */
  async runWeeklyReset(now: Date = new Date()) {
    const schools = await this.prisma.school.findMany({
      select: { id: true, timezone: true },
    });

    return Promise.all(
      schools.map(async (s: { id: string; timezone: string | null }) => {
        const tz = s.timezone || SCHOOL_TZ;
        const weekEnd = getWeekStartInTimeZone(tz, now);
        const weekStart = new Date(weekEnd);
        weekStart.setUTCDate(weekStart.getUTCDate() - 7);
        const snapshotCount = await this.runResetForSchool(
          s.id,
          weekStart,
          weekEnd,
        );
        return { schoolId: s.id, snapshotCount };
      }),
    );
  }

  /** Convenience: snapshot the current (in-progress) week using UTC bounds. */
  async runResetForCurrentWeek() {
    const weekStart = getCurrentWeekStart();
    const weekEnd = getNextWeekStart();
    const schools = await this.prisma.school.findMany({ select: { id: true } });
    return Promise.all(
      schools.map(async (s: { id: string }) => {
        const snapshotCount = await this.runResetForSchool(
          s.id,
          weekStart,
          weekEnd,
        );
        return { schoolId: s.id, snapshotCount };
      }),
    );
  }

  /**
   * Build snapshots for a single school. Idempotent — re-running for the same
   * (schoolId, weekStart) updates existing snapshots rather than duplicating.
   */
  async runResetForSchool(
    schoolId: string,
    weekStart: Date,
    weekEnd: Date,
  ): Promise<number> {
    const snapshotCount = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const grouped = await tx.attendanceEntry.groupBy({
          by: ['studentUserId'],
          _sum: { pointsAwarded: true },
          where: {
            createdAt: { gte: weekStart, lt: weekEnd },
            student: { schoolId },
          },
        });

        // Ensure every student in the school gets a snapshot row, even if 0.
        const students = await tx.user.findMany({
          where: { schoolId },
          select: { id: true },
        });
        const pointsByStudent = new Map<string, number>(
          grouped.map(
            (g: { studentUserId: string; _sum: { pointsAwarded: number | null } }) => [
              g.studentUserId,
              g._sum.pointsAwarded ?? 0,
            ],
          ),
        );

        let count = 0;
        for (const stu of students) {
          const points = pointsByStudent.get(stu.id) ?? 0;
          const restricted = points >= RESTRICTION_THRESHOLD;
          await tx.weeklyPointSnapshot.upsert({
            where: {
              schoolId_studentUserId_weekStart: {
                schoolId,
                studentUserId: stu.id,
                weekStart,
              },
            },
            create: {
              schoolId,
              studentUserId: stu.id,
              weekStart,
              points,
              restricted,
              finalizedAt: new Date(),
            },
            update: {
              points,
              restricted,
              finalizedAt: new Date(),
            },
          });
          count++;
        }
        return count;
      },
    );

    this.events.emit('attendance.weekly_reset.completed', {
      schoolId,
      weekStart: weekStart.toISOString(),
      snapshotCount,
    });

    return snapshotCount;
  }
}
