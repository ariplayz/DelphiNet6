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
    return {
      from: from.toISOString(),
      to: to.toISOString(),
      sessions: classes.sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
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
    return { supervisedClasses, captainDorms, pendingVerifications, pendingStories };
  }
}
