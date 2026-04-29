import { Controller, Get, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { ClassesService } from '../classes/classes.service';
import { AttendanceService } from '../attendance/attendance.service';

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
}
