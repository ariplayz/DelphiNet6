import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { RequirePermission } from '../auth/require-permission.decorator';
import { DormsService } from './dorms.service';
import {
  CreateDormDto,
  CreateRoomDto,
  CreateScheduleSlotDto,
  MarkRoomMessyDto,
  SetDormEntryStatusDto,
  SetResidentsDto,
  UpdateDormDto,
  UpdateRoomDto,
  UpdateScheduleSlotDto,
} from './dto/dorm.dto';

function schoolOf(req: Request): string {
  return (req as unknown as { schoolId: string }).schoolId;
}

@Controller('dorms')
export class DormsController {
  constructor(private readonly service: DormsService) {}

  // ─── Personal views (must be declared before :id routes) ────────────────

  @Get('me/captaincy')
  myCaptaincy(@Req() req: Request) {
    return this.service.getMyDormCaptaincies(schoolOf(req), req.user!.id);
  }

  @Get('me/residence')
  myResidence(@Req() req: Request) {
    return this.service.getMyDormAsResident(schoolOf(req), req.user!.id);
  }

  // ─── Rooms (declared before :id) ────────────────────────────────────────

  @Patch('rooms/:roomId')
  @RequirePermission('reslife.manage')
  updateRoom(
    @Req() req: Request,
    @Param('roomId') roomId: string,
    @Body() dto: UpdateRoomDto,
  ) {
    return this.service.updateRoom(schoolOf(req), req.user!.id, roomId, dto);
  }

  @Delete('rooms/:roomId')
  @RequirePermission('reslife.manage')
  deleteRoom(@Req() req: Request, @Param('roomId') roomId: string) {
    return this.service.deleteRoom(schoolOf(req), req.user!.id, roomId);
  }

  @Put('rooms/:roomId/residents')
  @RequirePermission('reslife.manage')
  setResidents(
    @Req() req: Request,
    @Param('roomId') roomId: string,
    @Body() dto: SetResidentsDto,
  ) {
    return this.service.setRoomAssignments(
      schoolOf(req),
      req.user!.id,
      roomId,
      dto.userIds,
    );
  }

  // ─── Schedule (declared before :id) ─────────────────────────────────────

  @Patch('schedule/:slotId')
  @RequirePermission('reslife.manage')
  updateSlot(
    @Req() req: Request,
    @Param('slotId') slotId: string,
    @Body() dto: UpdateScheduleSlotDto,
  ) {
    return this.service.updateScheduleSlot(
      schoolOf(req),
      req.user!.id,
      slotId,
      dto,
    );
  }

  @Delete('schedule/:slotId')
  @RequirePermission('reslife.manage')
  removeSlot(@Req() req: Request, @Param('slotId') slotId: string) {
    return this.service.removeScheduleSlot(schoolOf(req), req.user!.id, slotId);
  }

  // ─── Dorm CRUD ──────────────────────────────────────────────────────────

  @Get()
  list(@Req() req: Request) {
    return this.service.listDorms(schoolOf(req));
  }

  @Get(':id')
  get(@Req() req: Request, @Param('id') id: string) {
    return this.service.getDorm(schoolOf(req), id);
  }

  @Post()
  @RequirePermission('reslife.manage')
  create(@Req() req: Request, @Body() dto: CreateDormDto) {
    return this.service.createDorm(schoolOf(req), req.user!.id, dto);
  }

  @Patch(':id')
  @RequirePermission('reslife.manage')
  update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateDormDto,
  ) {
    return this.service.updateDorm(schoolOf(req), req.user!.id, id, dto);
  }

  @Delete(':id')
  @RequirePermission('reslife.manage')
  remove(@Req() req: Request, @Param('id') id: string) {
    return this.service.deleteDorm(schoolOf(req), req.user!.id, id);
  }

  // ─── Rooms (per-dorm) ───────────────────────────────────────────────────

  @Post(':id/rooms')
  @RequirePermission('reslife.manage')
  addRoom(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: CreateRoomDto,
  ) {
    return this.service.addRoom(schoolOf(req), req.user!.id, id, dto);
  }

  // ─── Schedule (per-dorm) ────────────────────────────────────────────────

  @Get(':id/schedule')
  listSchedule(@Req() req: Request, @Param('id') id: string) {
    return this.service.listSchedule(schoolOf(req), id);
  }

  @Post(':id/schedule')
  @RequirePermission('reslife.manage')
  addSlot(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: CreateScheduleSlotDto,
  ) {
    return this.service.addScheduleSlot(
      schoolOf(req),
      req.user!.id,
      id,
      dto,
    );
  }
}

@Controller('dorm-roll-call')
export class DormRollCallController {
  constructor(private readonly service: DormsService) {}

  @Get('my-pending')
  @RequirePermission('dorm.roll_call')
  myPending(@Req() req: Request) {
    return this.service.getMyDormPendingToday(schoolOf(req), req.user!.id);
  }

  @Get(':slotId/today')
  @RequirePermission('dorm.roll_call')
  open(@Req() req: Request, @Param('slotId') slotId: string) {
    return this.service.getOrCreateDormRollCall(
      schoolOf(req),
      slotId,
      req.user!.id,
    );
  }

  @Patch('entries/:entryId')
  setEntry(
    @Req() req: Request,
    @Param('entryId') entryId: string,
    @Body() dto: SetDormEntryStatusDto,
  ) {
    const perms = req.user?.permissions ?? [];
    // Allow either dorm.roll_call (captain) or reslife.manage (staff).
    if (
      !perms.includes('dorm.roll_call') &&
      !perms.includes('reslife.manage') &&
      !perms.includes('attendance.amend') &&
      !perms.includes('super_admin.all')
    ) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return this.service.setDormEntryStatus(
      { id: req.user!.id, permissions: perms },
      entryId,
      dto,
    );
  }

  @Post(':rollCallId/rooms/:roomId/messy')
  markMessy(
    @Req() req: Request,
    @Param('rollCallId') rollCallId: string,
    @Param('roomId') roomId: string,
    @Body() _dto: MarkRoomMessyDto,
  ) {
    const perms = req.user?.permissions ?? [];
    if (
      !perms.includes('dorm.roll_call') &&
      !perms.includes('reslife.manage') &&
      !perms.includes('super_admin.all')
    ) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return this.service.markRoomMessy(
      { id: req.user!.id, permissions: perms },
      rollCallId,
      roomId,
    );
  }
}
