import {
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
import {
  BulkSetEntriesDto,
  SetEntryStatusDto,
} from './dto/set-entry-status.dto';

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly service: AttendanceService) {}

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
}
