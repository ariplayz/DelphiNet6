import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { RequirePermission } from '../auth/require-permission.decorator';
import { AttendanceService } from './attendance.service';
import { WeeklyResetService } from './weekly-reset.service';
import {
  BulkSetEntriesDto,
  SetEntryStatusDto,
} from './dto/set-entry-status.dto';
import { getCurrentWeekStart } from './attendance.week';

@Controller('attendance')
export class AttendanceController {
  constructor(
    private readonly service: AttendanceService,
    private readonly weeklyReset: WeeklyResetService,
  ) {}

  @Get('sessions/:sessionId/roll-call')
  @RequirePermission('attendance.record')
  openRollCall(@Req() req: Request, @Param('sessionId') sessionId: string) {
    const schoolId = (req as any).schoolId as string;
    return this.service.getOrCreateRollCall(schoolId, sessionId, req.user!.id);
  }

  @Patch('entries/:entryId')
  @RequirePermission('attendance.record')
  setEntry(
    @Req() req: Request,
    @Param('entryId') entryId: string,
    @Body() dto: SetEntryStatusDto,
  ) {
    return this.service.setEntryStatus(
      { id: req.user!.id, permissions: req.user!.permissions ?? [] },
      entryId,
      dto,
    );
  }

  @Post('roll-calls/:rollCallId/bulk')
  @RequirePermission('attendance.record')
  bulk(
    @Req() req: Request,
    @Param('rollCallId') rollCallId: string,
    @Body() dto: BulkSetEntriesDto,
  ) {
    return this.service.bulkSetEntries(
      { id: req.user!.id, permissions: req.user!.permissions ?? [] },
      rollCallId,
      dto.entries ?? [],
    );
  }

  @Get('me/week')
  myWeek(@Req() req: Request) {
    return this.service.getStudentRestrictionStatus(req.user!.id);
  }

  @Get('me/history')
  myHistory(
    @Req() req: Request,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.getMyAttendanceHistory(req.user!.id, {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
  }

  @Get('my-pending')
  @RequirePermission('attendance.record')
  myPending(@Req() req: Request) {
    const schoolId = (req as any).schoolId as string;
    return this.service.getMyPendingRollCalls(schoolId, req.user!.id);
  }

  @Get('restricted')
  @RequirePermission('attendance.view_all')
  restricted(@Req() req: Request) {
    const schoolId = (req as any).schoolId as string;
    return this.service.getRestrictedStudents(schoolId);
  }

  @Get('users/:userId/week')
  @RequirePermission('attendance.view_all')
  userWeek(@Param('userId') userId: string) {
    return this.service.getStudentRestrictionStatus(userId);
  }

  // ─── Phase 10: history snapshots ─────────────────────────────────────────

  @Get('me/history/snapshots')
  mySnapshots(@Req() req: Request) {
    return this.service.getUserSnapshots(req.user!.id);
  }

  @Get('users/:userId/history/snapshots')
  @RequirePermission('attendance.view_all')
  userSnapshots(@Param('userId') userId: string) {
    return this.service.getUserSnapshots(userId);
  }

  @Get('all-snapshots')
  @RequirePermission('students.view_all')
  allSnapshots(@Req() req: Request, @Query('weeks') weeksStr?: string) {
    const schoolId = (req as any).schoolId as string;
    const weeks = weeksStr ? Math.max(1, Math.min(52, parseInt(weeksStr, 10) || 12)) : 12;
    return this.service.getAllStudentSnapshots(schoolId, weeks);
  }

  @Post('admin/run-weekly-reset')
  @RequirePermission('attendance.amend')
  async runWeeklyReset() {
    const schools = await this.weeklyReset.runResetForCurrentWeek();
    return { schools };
  }

  // ─── Phase 11: verification queue ────────────────────────────────────────

  @Get('verification/queue')
  @RequirePermission('attendance.verify')
  async verificationQueue(
    @Req() req: Request,
    @Query('week') week?: 'current' | 'previous',
    @Query('includeVerified') includeVerified?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const schoolId = (req as any).schoolId as string;
    let weekStart = getCurrentWeekStart();
    if (week === 'previous') {
      weekStart = new Date(weekStart);
      weekStart.setUTCDate(weekStart.getUTCDate() - 7);
    }
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

    const include =
      includeVerified === 'true' || includeVerified === '1';
    const lim = limit ? Math.min(500, Math.max(1, parseInt(limit, 10))) : 100;
    const off = offset ? Math.max(0, parseInt(offset, 10)) : 0;

    const entries = await this.service.listEntriesForVerification({
      schoolId,
      weekStart,
      weekEnd,
      includeVerified: include,
      limit: lim,
      offset: off,
    });

    return {
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      includeVerified: include,
      entries,
    };
  }

  @Post('entries/:id/verify')
  @RequirePermission('attendance.verify')
  verify(@Req() req: Request, @Param('id') id: string) {
    return this.service.verifyEntry(id, req.user!.id);
  }

  @Post('entries/:id/excuse')
  @RequirePermission('attendance.verify')
  excuse(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    if (!body?.reason) {
      throw new BadRequestException('reason is required');
    }
    return this.service.excuseEntry(id, req.user!.id, body.reason);
  }
}
