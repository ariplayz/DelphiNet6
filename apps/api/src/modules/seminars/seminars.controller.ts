import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { RequirePermission } from '../auth/require-permission.decorator';
import { SeminarsService } from './seminars.service';
import { CreateSeminarDto } from './dto/create-seminar.dto';
import { UpdateSeminarDto } from './dto/update-seminar.dto';
import { SetSeminarRosterDto } from './dto/set-roster.dto';
import { RecordSeminarAttendanceDto } from './dto/record-attendance.dto';

@Controller('seminars')
export class SeminarsController {
  constructor(private readonly service: SeminarsService) {}

  @Get()
  @RequirePermission('seminar.view')
  list(@Req() req: Request, @Query('includeArchived') includeArchived?: string) {
    const schoolId = (req as any).schoolId as string;
    return this.service.list(schoolId, { includeArchived: includeArchived === 'true' });
  }

  @Get('mine/leading')
  myLeading(@Req() req: Request) {
    return this.service.ledBy(req.user!.id);
  }

  @Get('mine/enrolled')
  myEnrolled(@Req() req: Request) {
    return this.service.enrolledFor(req.user!.id);
  }

  @Get(':id')
  @RequirePermission('seminar.view')
  get(@Req() req: Request, @Param('id') id: string) {
    const schoolId = (req as any).schoolId as string;
    return this.service.get(schoolId, id);
  }

  @Post()
  @RequirePermission('seminar.manage')
  create(@Req() req: Request, @Body() dto: CreateSeminarDto) {
    const schoolId = (req as any).schoolId as string;
    return this.service.create(schoolId, req.user!.id, dto);
  }

  @Patch(':id')
  @RequirePermission('seminar.manage')
  update(@Req() req: Request, @Param('id') id: string, @Body() dto: UpdateSeminarDto) {
    const schoolId = (req as any).schoolId as string;
    return this.service.update(schoolId, req.user!.id, id, dto);
  }

  @Delete(':id')
  @RequirePermission('seminar.manage')
  remove(@Req() req: Request, @Param('id') id: string) {
    const schoolId = (req as any).schoolId as string;
    return this.service.remove(schoolId, req.user!.id, id);
  }

  @Put(':id/roster')
  @RequirePermission('seminar.manage')
  setRoster(@Req() req: Request, @Param('id') id: string, @Body() dto: SetSeminarRosterDto) {
    const schoolId = (req as any).schoolId as string;
    return this.service.setRoster(schoolId, req.user!.id, id, dto.studentUserIds);
  }

  @Post(':id/sessions/today')
  async todaySession(@Req() req: Request, @Param('id') id: string) {
    const schoolId = (req as any).schoolId as string;
    const perms: string[] = (req.user as any)?.permissions ?? [];
    await this.service.assertCanRecord(schoolId, id, req.user!.id, perms);
    return this.service.getOrCreateTodaySession(schoolId, id);
  }

  @Get(':id/sessions/:sid/attendance')
  async sessionAttendance(
    @Req() req: Request,
    @Param('id') id: string,
    @Param('sid') sid: string,
  ) {
    const schoolId = (req as any).schoolId as string;
    const perms: string[] = (req.user as any)?.permissions ?? [];
    await this.service.assertCanRecord(schoolId, id, req.user!.id, perms);
    return this.service.getSessionAttendance(sid);
  }

  @Post(':id/sessions/:sid/attendance')
  async record(
    @Req() req: Request,
    @Param('id') id: string,
    @Param('sid') sid: string,
    @Body() dto: RecordSeminarAttendanceDto,
  ) {
    const schoolId = (req as any).schoolId as string;
    const perms: string[] = (req.user as any)?.permissions ?? [];
    await this.service.assertCanRecord(schoolId, id, req.user!.id, perms);
    return this.service.recordAttendance(schoolId, req.user!.id, id, sid, dto);
  }
}
