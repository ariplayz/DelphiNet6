import { Controller, Get, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { ClassesService } from '../classes/classes.service';
import { AttendanceService } from '../attendance/attendance.service';
import { PrismaService } from '../database/prisma.service';

/**
 * "Me" endpoints — read-only views scoped to the calling user. Cross-cutting
 * by design: aggregates data from multiple modules (classes today, schedule,
 * eventually seminars + points). Lives in its own module to avoid pulling
 * controllers into business modules.
 */
@Controller('me')
export class MeController {
  constructor(
    private readonly classes: ClassesService,
    private readonly attendance: AttendanceService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Sessions in [from, to). Defaults to a 7-day window starting at the
   * current UTC midnight if no bounds are provided.
   */
  @Get('schedule')
  async schedule(
    @Req() req: Request,
    @Query('from') fromStr?: string,
    @Query('to') toStr?: string,
  ) {
    const u = req.user as any;
    const schoolId = (req as any).schoolId as string;

    const now = new Date();
    const defaultFrom = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const defaultTo = new Date(defaultFrom);
    defaultTo.setUTCDate(defaultTo.getUTCDate() + 7);

    const from = fromStr ? new Date(fromStr) : defaultFrom;
    const to = toStr ? new Date(toStr) : defaultTo;

    const classes = await this.classes.getScheduleForUser(schoolId, u.id, from, to);

    // Seminars (no points, no rollcall here — just calendar entries).
    const seminarRows = await this.prisma.seminar.findMany({
      where: {
        schoolId,
        isArchived: false,
        OR: [
          { leaderUserId: u.id },
          { enrollments: { some: { studentUserId: u.id, removedAt: null } } },
        ],
      },
      select: {
        id: true, name: true, location: true,
        daysOfWeek: true, startsAt: true, durationMinutes: true,
        leaderUserId: true,
      },
    });
    const seminarSessions: any[] = [];
    for (const s of seminarRows) {
      for (let d = new Date(from); d < to; d = new Date(d.getTime() + 24 * 60 * 60 * 1000)) {
        if (!s.daysOfWeek.includes(d.getUTCDay())) continue;
        const [hh, mm] = s.startsAt.split(':').map((x) => parseInt(x, 10) || 0);
        const startsAt = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), hh, mm));
        if (startsAt < from || startsAt >= to) continue;
        const endsAt = new Date(startsAt.getTime() + s.durationMinutes * 60 * 1000);
        seminarSessions.push({
          kind: 'seminar',
          seminarId: s.id,
          name: s.name,
          location: s.location,
          isLeader: s.leaderUserId === u.id,
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString(),
        });
      }
    }

    const all = [...classes, ...seminarSessions].sort((a, b) =>
      String(a.startsAt).localeCompare(String(b.startsAt)),
    );

    return {
      from: from.toISOString(),
      to: to.toISOString(),
      sessions: all,
    };
  }

  /** Attendance points summary for the calling student. */
  @Get('points')
  async points(@Req() req: Request, @Query('weeks') weeksStr?: string) {
    const u = req.user as any;
    const weeks = weeksStr ? Math.max(1, Math.min(52, parseInt(weeksStr, 10) || 12)) : 12;
    return this.attendance.getStudentPointSummary(u.id, weeks);
  }

  /**
   * Lightweight counts of the things the user is actually responsible for.
   * Used by the nav so that "Roll Call" / "Dorm Roll Call" only show up
   * when the user supervises at least one class / is captain of at least
   * one dorm.
   */
  @Get('assignments')
  async assignments(@Req() req: Request) {
    const u = req.user as any;
    const schoolId = (req as any).schoolId as string;
    const perms: string[] = u.permissions ?? [];
    const canVerify = perms.includes('attendance.verify');
    const canVerifyStories = perms.includes('success_story.verify');
    const [supervisedClasses, captainDorms, pendingVerifications, pendingStories] = await Promise.all([
      this.prisma.class.count({ where: { schoolId, supervisorUserId: u.id } }),
      this.prisma.dorm.count({ where: { schoolId, captainUserId: u.id } }),
      canVerify
        ? this.prisma.attendanceEntry.count({ where: { verificationStatus: 'unverified', pointsAwarded: { gt: 0 } } })
        : Promise.resolve(0),
      canVerifyStories
        ? this.prisma.successStory.count({ where: { schoolId, verifiedAt: null } })
        : Promise.resolve(0),
    ]);
    return {
      supervisedClasses,
      captainDorms,
      pendingVerifications,
      pendingStories,
      ledSeminars: await this.prisma.seminar.count({ where: { schoolId, leaderUserId: u.id, isArchived: false } }),
    };
  }
}
