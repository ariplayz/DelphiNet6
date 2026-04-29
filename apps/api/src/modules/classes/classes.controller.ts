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
import { ClassesService } from './classes.service';
import { AttendanceService } from '../attendance/attendance.service';
import { ForbiddenException } from '@nestjs/common';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { SetRosterDto } from './dto/set-roster.dto';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';

@Controller('classes')
export class ClassesController {
  constructor(
    private readonly service: ClassesService,
    private readonly attendance: AttendanceService,
  ) {}

  @Get()
  @RequirePermission('class.view')
  list(
    @Req() req: Request,
    @Query('mine') mine?: string,
    @Query('supervisor') supervisor?: string,
  ) {
    const schoolId = (req as any).schoolId as string;
    return this.service.list(schoolId, {
      mineOnly: mine === 'true',
      userId: req.user!.id,
      supervisorId: supervisor,
    });
  }

  @Get('mine')
  mine(@Req() req: Request) {
    const schoolId = (req as any).schoolId as string;
    return this.service.getMyClasses(schoolId, req.user!.id);
  }

  @Get('supervised')
  supervised(@Req() req: Request) {
    const schoolId = (req as any).schoolId as string;
    return this.service.getClassesISupervise(schoolId, req.user!.id);
  }

  @Patch('sessions/:sessionId')
  @RequirePermission('class.manage')
  updateSession(
    @Req() req: Request,
    @Param('sessionId') sessionId: string,
    @Body() dto: UpdateSessionDto,
  ) {
    const schoolId = (req as any).schoolId as string;
    return this.service.updateSession(schoolId, req.user!.id, sessionId, dto);
  }

  @Delete('sessions/:sessionId')
  @RequirePermission('class.manage')
  deleteSession(@Req() req: Request, @Param('sessionId') sessionId: string) {
    const schoolId = (req as any).schoolId as string;
    return this.service.removeSession(schoolId, req.user!.id, sessionId);
  }

  @Get(':id')
  @RequirePermission('class.view')
  get(@Req() req: Request, @Param('id') id: string) {
    const schoolId = (req as any).schoolId as string;
    return this.service.get(schoolId, id);
  }

  @Get(':id/overview')
  @RequirePermission('class.view')
  async overview(@Req() req: Request, @Param('id') id: string) {
    const schoolId = (req as any).schoolId as string;
    const userId = req.user!.id;
    const cls = await this.service.get(schoolId, id);
    const perms: string[] = (req.user as any)?.permissions ?? [];
    if (cls.supervisorUserId !== userId && !perms.includes('class.manage')) {
      throw new ForbiddenException('Only the class supervisor or an admin can view this overview');
    }
    return this.attendance.getClassSupervisorOverview(id);
  }

  @Post()
  @RequirePermission('class.manage')
  create(@Req() req: Request, @Body() dto: CreateClassDto) {
    const schoolId = (req as any).schoolId as string;
    return this.service.create(schoolId, req.user!.id, dto);
  }

  @Patch(':id')
  @RequirePermission('class.manage')
  update(@Req() req: Request, @Param('id') id: string, @Body() dto: UpdateClassDto) {
    const schoolId = (req as any).schoolId as string;
    return this.service.update(schoolId, req.user!.id, id, dto);
  }

  @Delete(':id')
  @RequirePermission('class.manage')
  remove(@Req() req: Request, @Param('id') id: string) {
    const schoolId = (req as any).schoolId as string;
    return this.service.remove(schoolId, req.user!.id, id);
  }

  @Put(':id/roster')
  @RequirePermission('class.manage')
  setRoster(@Req() req: Request, @Param('id') id: string, @Body() dto: SetRosterDto) {
    const schoolId = (req as any).schoolId as string;
    return this.service.setRoster(schoolId, req.user!.id, id, dto.userIds);
  }

  @Get(':id/sessions')
  @RequirePermission('class.view')
  listSessions(
    @Req() req: Request,
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const schoolId = (req as any).schoolId as string;
    return this.service.listSessions(schoolId, id, {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
  }

  @Post(':id/sessions')
  @RequirePermission('class.manage')
  addSession(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: CreateSessionDto,
  ) {
    const schoolId = (req as any).schoolId as string;
    return this.service.addSession(schoolId, req.user!.id, id, dto);
  }
}
