import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { TypedEventEmitter } from '../event-bus/typed-event-emitter.service';
import { POINTS } from '../attendance/attendance.constants';
import {
  CreateDormDto,
  CreateRoomDto,
  CreateScheduleSlotDto,
  SetDormEntryStatusDto,
  UpdateDormDto,
  UpdateRoomDto,
  UpdateScheduleSlotDto,
} from './dto/dorm.dto';

const userSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  form: true,
} as const;

@Injectable()
export class DormsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: TypedEventEmitter,
  ) {}

  // ─── Dorms ─────────────────────────────────────────────────────────────────

  async listDorms(schoolId: string) {
    const dorms = await this.prisma.dorm.findMany({
      where: { schoolId },
      include: {
        captain: { select: userSelect },
        rooms: {
          include: {
            assignments: {
              where: { until: null },
              select: { id: true },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return dorms.map((d: typeof dorms[number]) => {
      const roomCount = d.rooms.length;
      const occupancy = d.rooms.reduce(
        (n: number, r: { assignments: { id: string }[] }) => n + r.assignments.length,
        0,
      );
      return {
        id: d.id,
        schoolId: d.schoolId,
        name: d.name,
        notes: d.notes,
        captainUserId: d.captainUserId,
        captain: d.captain,
        roomCount,
        occupancy,
        createdAt: d.createdAt,
      };
    });
  }

  async getDorm(schoolId: string, id: string) {
    const dorm = await this.prisma.dorm.findFirst({
      where: { id, schoolId },
      include: {
        captain: { select: userSelect },
        rooms: {
          orderBy: { name: 'asc' },
          include: {
            assignments: {
              where: { until: null },
              include: { student: { select: userSelect } },
              orderBy: { since: 'asc' },
            },
          },
        },
        schedules: {
          orderBy: [{ slot: 'asc' }, { timeOfDay: 'asc' }],
        },
      },
    });
    if (!dorm) throw new NotFoundException(`Dorm ${id} not found`);
    return dorm;
  }

  async createDorm(schoolId: string, actorId: string, dto: CreateDormDto) {
    if (dto.captainUserId) {
      await this.assertUserInSchool(schoolId, dto.captainUserId);
    }
    const dorm = await this.prisma.dorm.create({
      data: {
        schoolId,
        name: dto.name,
        captainUserId: dto.captainUserId ?? null,
        notes: dto.notes ?? null,
      },
    });
    this.events.emit('dorm.created', { dormId: dorm.id, schoolId, createdBy: actorId });
    if (dorm.captainUserId) {
      this.events.emit('dorm.captain.assigned', {
        dormId: dorm.id,
        captainUserId: dorm.captainUserId,
        assignedBy: actorId,
      });
    }
    return dorm;
  }

  async updateDorm(
    schoolId: string,
    actorId: string,
    id: string,
    dto: UpdateDormDto,
  ) {
    const existing = await this.prisma.dorm.findFirst({ where: { id, schoolId } });
    if (!existing) throw new NotFoundException(`Dorm ${id} not found`);

    if (dto.captainUserId) {
      await this.assertUserInSchool(schoolId, dto.captainUserId);
    }

    const data: Prisma.DormUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.notes !== undefined) data.notes = (dto.notes as string | null) ?? null;
    if (dto.captainUserId !== undefined) {
      data.captain = dto.captainUserId
        ? { connect: { id: dto.captainUserId as string } }
        : { disconnect: true };
    }

    const dorm = await this.prisma.dorm.update({ where: { id }, data });

    this.events.emit('dorm.updated', { dormId: id, schoolId, updatedBy: actorId });
    if (dto.captainUserId !== undefined && existing.captainUserId !== dorm.captainUserId) {
      this.events.emit('dorm.captain.assigned', {
        dormId: id,
        captainUserId: dorm.captainUserId,
        assignedBy: actorId,
      });
    }
    return dorm;
  }

  async deleteDorm(schoolId: string, actorId: string, id: string) {
    const existing = await this.prisma.dorm.findFirst({ where: { id, schoolId } });
    if (!existing) throw new NotFoundException(`Dorm ${id} not found`);
    // Rooms cascade via schema. Schedules cascade. Slots cascade.
    await this.prisma.dorm.delete({ where: { id } });
    this.events.emit('dorm.deleted', { dormId: id, schoolId, deletedBy: actorId });
    return { deleted: true };
  }

  // ─── Rooms ─────────────────────────────────────────────────────────────────

  async addRoom(schoolId: string, actorId: string, dormId: string, dto: CreateRoomDto) {
    const dorm = await this.prisma.dorm.findFirst({ where: { id: dormId, schoolId } });
    if (!dorm) throw new NotFoundException(`Dorm ${dormId} not found`);

    const room = await this.prisma.dormRoom.create({
      data: { dormId, name: dto.name, capacity: dto.capacity ?? 1 },
    });
    this.events.emit('dorm.room.created', {
      roomId: room.id,
      dormId,
      schoolId,
      createdBy: actorId,
    });
    return room;
  }

  async updateRoom(
    schoolId: string,
    actorId: string,
    roomId: string,
    dto: UpdateRoomDto,
  ) {
    const room = await this.prisma.dormRoom.findUnique({
      where: { id: roomId },
      include: { dorm: true },
    });
    if (!room || room.dorm.schoolId !== schoolId) {
      throw new NotFoundException(`Room ${roomId} not found`);
    }
    const updated = await this.prisma.dormRoom.update({
      where: { id: roomId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.capacity !== undefined ? { capacity: dto.capacity } : {}),
      },
    });
    this.events.emit('dorm.room.updated', {
      roomId,
      dormId: room.dormId,
      schoolId,
      updatedBy: actorId,
    });
    return updated;
  }

  async deleteRoom(schoolId: string, actorId: string, roomId: string) {
    const room = await this.prisma.dormRoom.findUnique({
      where: { id: roomId },
      include: { dorm: true },
    });
    if (!room || room.dorm.schoolId !== schoolId) {
      throw new NotFoundException(`Room ${roomId} not found`);
    }
    await this.prisma.dormRoom.delete({ where: { id: roomId } });
    this.events.emit('dorm.room.deleted', {
      roomId,
      dormId: room.dormId,
      schoolId,
      deletedBy: actorId,
    });
    return { deleted: true };
  }

  /** Atomic replace of active assignments for a room. */
  async setRoomAssignments(
    schoolId: string,
    actorId: string,
    roomId: string,
    userIds: string[],
  ) {
    const room = await this.prisma.dormRoom.findUnique({
      where: { id: roomId },
      include: { dorm: true },
    });
    if (!room || room.dorm.schoolId !== schoolId) {
      throw new NotFoundException(`Room ${roomId} not found`);
    }

    // Verify users belong to this school.
    if (userIds.length > 0) {
      const found = await this.prisma.user.findMany({
        where: { id: { in: userIds }, schoolId },
        select: { id: true },
      });
      if (found.length !== userIds.length) {
        throw new BadRequestException('One or more users do not belong to this school');
      }
    }

    const desired = new Set(userIds);
    const result = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const current = await tx.dormAssignment.findMany({
        where: { dormRoomId: roomId, until: null },
      });
      const currentIds = new Set(
        current.map((a: { studentUserId: string }) => a.studentUserId),
      );
      const toRemove = current.filter(
        (a: { studentUserId: string }) => !desired.has(a.studentUserId),
      );
      const toAdd = userIds.filter((u) => !currentIds.has(u));

      if (toRemove.length > 0) {
        await tx.dormAssignment.updateMany({
          where: { id: { in: toRemove.map((a: { id: string }) => a.id) } },
          data: { until: new Date() },
        });
      }
      for (const studentUserId of toAdd) {
        await tx.dormAssignment.create({
          data: { dormRoomId: roomId, studentUserId },
        });
      }

      return {
        added: toAdd,
        removed: toRemove.map((a: { studentUserId: string }) => a.studentUserId),
      };
    });

    this.events.emit('dorm.assignment.changed', {
      roomId,
      dormId: room.dormId,
      schoolId,
      addedUserIds: result.added,
      removedUserIds: result.removed,
      changedBy: actorId,
    });

    // Return the room with its new residents.
    return this.prisma.dormRoom.findUnique({
      where: { id: roomId },
      include: {
        assignments: {
          where: { until: null },
          include: { student: { select: userSelect } },
        },
      },
    });
  }

  // ─── Schedule ──────────────────────────────────────────────────────────────

  async listSchedule(schoolId: string, dormId: string) {
    const dorm = await this.prisma.dorm.findFirst({ where: { id: dormId, schoolId } });
    if (!dorm) throw new NotFoundException(`Dorm ${dormId} not found`);
    return this.prisma.dormRollCallSchedule.findMany({
      where: { dormId },
      orderBy: [{ slot: 'asc' }, { timeOfDay: 'asc' }],
    });
  }

  async addScheduleSlot(
    schoolId: string,
    actorId: string,
    dormId: string,
    dto: CreateScheduleSlotDto,
  ) {
    const dorm = await this.prisma.dorm.findFirst({ where: { id: dormId, schoolId } });
    if (!dorm) throw new NotFoundException(`Dorm ${dormId} not found`);

    const created = await this.prisma.dormRollCallSchedule.create({
      data: {
        dormId,
        slot: dto.slot,
        timeOfDay: dto.timeOfDay,
        daysOfWeek: dto.daysOfWeek,
        allowsMessyRoomPoints:
          dto.allowsMessyRoomPoints ?? dto.slot === 'morning',
      },
    });
    this.events.emit('dorm.schedule.changed', {
      dormId,
      schoolId,
      changedBy: actorId,
    });
    return created;
  }

  async updateScheduleSlot(
    schoolId: string,
    actorId: string,
    slotId: string,
    dto: UpdateScheduleSlotDto,
  ) {
    const slot = await this.prisma.dormRollCallSchedule.findUnique({
      where: { id: slotId },
      include: { dorm: true },
    });
    if (!slot || slot.dorm.schoolId !== schoolId) {
      throw new NotFoundException(`Slot ${slotId} not found`);
    }
    const updated = await this.prisma.dormRollCallSchedule.update({
      where: { id: slotId },
      data: {
        ...(dto.slot !== undefined ? { slot: dto.slot } : {}),
        ...(dto.timeOfDay !== undefined ? { timeOfDay: dto.timeOfDay } : {}),
        ...(dto.daysOfWeek !== undefined ? { daysOfWeek: dto.daysOfWeek } : {}),
        ...(dto.allowsMessyRoomPoints !== undefined
          ? { allowsMessyRoomPoints: dto.allowsMessyRoomPoints }
          : {}),
      },
    });
    this.events.emit('dorm.schedule.changed', {
      dormId: slot.dormId,
      schoolId,
      changedBy: actorId,
    });
    return updated;
  }

  async removeScheduleSlot(schoolId: string, actorId: string, slotId: string) {
    const slot = await this.prisma.dormRollCallSchedule.findUnique({
      where: { id: slotId },
      include: { dorm: true },
    });
    if (!slot || slot.dorm.schoolId !== schoolId) {
      throw new NotFoundException(`Slot ${slotId} not found`);
    }
    await this.prisma.dormRollCallSchedule.delete({ where: { id: slotId } });
    this.events.emit('dorm.schedule.changed', {
      dormId: slot.dormId,
      schoolId,
      changedBy: actorId,
    });
    return { deleted: true };
  }

  // ─── Personal views ────────────────────────────────────────────────────────

  async getMyDormCaptaincies(schoolId: string, userId: string) {
    return this.prisma.dorm.findMany({
      where: { schoolId, captainUserId: userId },
      orderBy: { name: 'asc' },
    });
  }

  async getMyDormAsResident(schoolId: string, userId: string) {
    const assignment = await this.prisma.dormAssignment.findFirst({
      where: { studentUserId: userId, until: null },
      include: {
        dormRoom: {
          include: {
            dorm: {
              include: { captain: { select: userSelect } },
            },
          },
        },
      },
    });
    if (!assignment || assignment.dormRoom.dorm.schoolId !== schoolId) {
      return null;
    }
    return {
      assignmentId: assignment.id,
      since: assignment.since,
      room: {
        id: assignment.dormRoom.id,
        name: assignment.dormRoom.name,
        capacity: assignment.dormRoom.capacity,
      },
      dorm: {
        id: assignment.dormRoom.dorm.id,
        name: assignment.dormRoom.dorm.name,
        captain: assignment.dormRoom.dorm.captain,
      },
    };
  }

  // ─── Roll call ─────────────────────────────────────────────────────────────

  /**
   * Idempotently open a dorm roll call for a given schedule (slot template) on
   * the given local date. Reuses RollCall + AttendanceEntry tables so that
   * weekly point aggregation continues to work without changes.
   */
  async getOrCreateDormRollCall(
    schoolId: string,
    scheduleId: string,
    takenById: string,
    date?: Date,
  ) {
    const schedule = await this.prisma.dormRollCallSchedule.findUnique({
      where: { id: scheduleId },
      include: {
        dorm: { include: { rooms: { include: { assignments: { where: { until: null } } } } } },
      },
    });
    if (!schedule || schedule.dorm.schoolId !== schoolId) {
      throw new NotFoundException(`Schedule ${scheduleId} not found`);
    }

    const day = date ?? new Date();
    const occursOn = new Date(
      Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate()),
    );

    // 1) Get-or-create the concrete DormRollCallSlot row for (schedule, day).
    const slotRow = await this.prisma.dormRollCallSlot.upsert({
      where: { scheduleId_occursOn: { scheduleId, occursOn } },
      create: { scheduleId, schoolId, occursOn },
      update: {},
    });

    // 2) Get-or-create the RollCall for that slot.
    const kind = schedule.slot === 'morning' ? 'DORM_MORNING' : 'DORM_EVENING';
    const existing = await this.prisma.rollCall.findFirst({
      where: { dormSlotId: slotRow.id },
    });

    let rollCallId: string;
    if (existing) {
      rollCallId = existing.id;
    } else {
      const residents = schedule.dorm.rooms.flatMap(
        (r: { assignments: { studentUserId: string }[] }) =>
          r.assignments.map((a) => a.studentUserId),
      );
      const created = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const again = await tx.rollCall.findFirst({ where: { dormSlotId: slotRow.id } });
        if (again) return again;
        const rc = await tx.rollCall.create({
          data: {
            kind: kind as 'DORM_MORNING' | 'DORM_EVENING',
            dormSlotId: slotRow.id,
            takenBy: takenById,
          },
        });
        if (residents.length > 0) {
          await tx.attendanceEntry.createMany({
            data: residents.map((studentUserId: string) => ({
              rollCallId: rc.id,
              studentUserId,
              status: 'HERE' as const,
              pointsAwarded: POINTS.HERE,
              kind: 'attendance',
            })),
          });
        }
        return rc;
      });
      rollCallId = created.id;
      this.events.emit('dorm.roll_call_opened', {
        rollCallId,
        dormId: schedule.dormId,
        schoolId,
      });
    }

    return this.loadDormRollCall(rollCallId, schoolId);
  }

  private async loadDormRollCall(rollCallId: string, schoolId: string) {
    const rc = await this.prisma.rollCall.findUnique({
      where: { id: rollCallId },
      include: {
        dormSlot: {
          include: { schedule: { include: { dorm: true } } },
        },
        entries: {
          include: { student: { select: userSelect } },
          orderBy: [
            { student: { lastName: 'asc' } },
            { student: { firstName: 'asc' } },
          ],
        },
      },
    });
    if (!rc || !rc.dormSlot || rc.dormSlot.schedule.dorm.schoolId !== schoolId) {
      throw new NotFoundException('Dorm roll call not found');
    }

    const dorm = rc.dormSlot.schedule.dorm;

    // Group entries by room based on currently active assignments.
    const dormFull = await this.prisma.dorm.findUnique({
      where: { id: dorm.id },
      include: {
        rooms: {
          orderBy: { name: 'asc' },
          include: {
            assignments: {
              where: { until: null },
              select: { studentUserId: true },
            },
          },
        },
      },
    });

    type Entry = (typeof rc.entries)[number];
    const attendanceEntries = (rc.entries as Entry[]).filter((e) => e.kind === 'attendance');
    const messyEntries = (rc.entries as Entry[]).filter((e) => e.kind === 'messy_room');

    const rooms = (dormFull?.rooms ?? []).map(
      (room: { id: string; name: string; capacity: number; assignments: { studentUserId: string }[] }) => {
        const studentIds = new Set(room.assignments.map((a) => a.studentUserId));
        const roomEntries = attendanceEntries.filter((e) => studentIds.has(e.studentUserId));
        const isMessy = messyEntries.some((e) => studentIds.has(e.studentUserId));
        return {
          id: room.id,
          name: room.name,
          capacity: room.capacity,
          messy: isMessy,
          entries: roomEntries,
        };
      },
    );

    // Entries for residents that no longer belong to any room (edge case).
    const knownIds = new Set(
      (dormFull?.rooms ?? []).flatMap(
        (r: { assignments: { studentUserId: string }[] }) =>
          r.assignments.map((a) => a.studentUserId),
      ),
    );
    const orphanEntries = attendanceEntries.filter((e) => !knownIds.has(e.studentUserId));

    return {
      id: rc.id,
      kind: rc.kind,
      takenAt: rc.takenAt,
      takenBy: rc.takenBy,
      locked: rc.locked,
      dormId: dorm.id,
      dormName: dorm.name,
      slotId: rc.dormSlot.scheduleId,
      slotKind: rc.dormSlot.schedule.slot,
      timeOfDay: rc.dormSlot.schedule.timeOfDay,
      allowsMessyRoomPoints: rc.dormSlot.schedule.allowsMessyRoomPoints,
      occursOn: rc.dormSlot.occursOn,
      rooms,
      orphanEntries,
    };
  }

  async setDormEntryStatus(
    user: { id: string; permissions: string[] },
    entryId: string,
    dto: SetDormEntryStatusDto,
  ) {
    const entry = await this.prisma.attendanceEntry.findUnique({
      where: { id: entryId },
      include: {
        rollCall: {
          include: {
            dormSlot: { include: { schedule: { include: { dorm: true } } } },
          },
        },
      },
    });
    if (!entry || !entry.rollCall.dormSlot) {
      throw new NotFoundException(`Dorm entry ${entryId} not found`);
    }
    const dorm = entry.rollCall.dormSlot.schedule.dorm;

    const isCaptain = dorm.captainUserId === user.id;
    const canManage =
      user.permissions.includes('reslife.manage') ||
      user.permissions.includes('attendance.amend') ||
      user.permissions.includes('super_admin.all');
    if (!isCaptain && !canManage) {
      throw new ForbiddenException('Not the captain of this dorm');
    }

    if (dto.status === 'EXCUSED') {
      if (!dto.excuseReason || dto.excuseReason.trim() === '') {
        throw new BadRequestException('excuseReason is required when status=EXCUSED');
      }
    }

    const newPoints = POINTS[dto.status];
    const updated = await this.prisma.attendanceEntry.update({
      where: { id: entryId },
      data: {
        status: dto.status,
        pointsAwarded: newPoints,
        excuseReason:
          dto.status === 'EXCUSED' ? dto.excuseReason!.trim() : null,
      },
      include: { student: { select: userSelect } },
    });

    this.events.emit('dorm.rollcall.entry.changed', {
      entryId: updated.id,
      rollCallId: updated.rollCallId,
      dormId: dorm.id,
      studentUserId: updated.studentUserId,
      oldStatus: entry.status,
      newStatus: updated.status,
      oldPoints: entry.pointsAwarded,
      newPoints: updated.pointsAwarded,
      changedBy: user.id,
    });
    // Also emit the generic attendance change so weekly aggregation listeners react.
    this.events.emit('attendance.entry.changed', {
      entryId: updated.id,
      rollCallId: updated.rollCallId,
      studentUserId: updated.studentUserId,
      oldStatus: entry.status,
      newStatus: updated.status,
      oldPoints: entry.pointsAwarded,
      newPoints: updated.pointsAwarded,
      changedBy: user.id,
    });

    return updated;
  }

  /**
   * Award +1 point to every active resident of a room. Idempotent per
   * (rollCallId, roomId): a second call returns the existing entries without
   * double-counting. MORNING-only.
   */
  async markRoomMessy(
    user: { id: string; permissions: string[] },
    rollCallId: string,
    roomId: string,
  ) {
    const rc = await this.prisma.rollCall.findUnique({
      where: { id: rollCallId },
      include: {
        dormSlot: { include: { schedule: { include: { dorm: true } } } },
      },
    });
    if (!rc || !rc.dormSlot) {
      throw new NotFoundException(`Dorm roll call ${rollCallId} not found`);
    }
    const dorm = rc.dormSlot.schedule.dorm;
    const isCaptain = dorm.captainUserId === user.id;
    const canManage =
      user.permissions.includes('reslife.manage') ||
      user.permissions.includes('attendance.amend') ||
      user.permissions.includes('super_admin.all');
    if (!isCaptain && !canManage) {
      throw new ForbiddenException('Not the captain of this dorm');
    }

    if (
      rc.kind !== 'DORM_MORNING' ||
      !rc.dormSlot.schedule.allowsMessyRoomPoints
    ) {
      throw new BadRequestException('Messy points can only be marked on morning roll calls');
    }

    const room = await this.prisma.dormRoom.findUnique({
      where: { id: roomId },
      include: {
        assignments: { where: { until: null } },
      },
    });
    if (!room || room.dormId !== dorm.id) {
      throw new NotFoundException(`Room ${roomId} not found in this dorm`);
    }

    const residentIds = room.assignments.map((a: { studentUserId: string }) => a.studentUserId);
    if (residentIds.length === 0) {
      return { rollCallId, roomId, residentUserIds: [], created: 0, alreadyMarked: false };
    }

    // Idempotency: if any messy_room entry already exists for any of these
    // residents in this roll call, treat as already marked.
    const already = await this.prisma.attendanceEntry.findMany({
      where: {
        rollCallId,
        kind: 'messy_room',
        studentUserId: { in: residentIds },
      },
      select: { studentUserId: true },
    });
    const alreadySet = new Set(already.map((e: { studentUserId: string }) => e.studentUserId));
    const toCreate = residentIds.filter((id) => !alreadySet.has(id));

    if (toCreate.length > 0) {
      await this.prisma.attendanceEntry.createMany({
        data: toCreate.map((studentUserId: string) => ({
          rollCallId,
          studentUserId,
          status: 'HERE' as const,
          pointsAwarded: 1,
          kind: 'messy_room',
        })),
      });
    }

    this.events.emit('dorm.room.marked_messy', {
      roomId,
      dormId: dorm.id,
      dormRollCallId: rollCallId,
      schoolId: dorm.schoolId,
      byUserId: user.id,
      residentUserIds: residentIds,
    });

    return {
      rollCallId,
      roomId,
      residentUserIds: residentIds,
      created: toCreate.length,
      alreadyMarked: toCreate.length === 0,
    };
  }

  /**
   * Today's dorm roll-call slots (DormRollCallSchedule rows whose daysOfWeek
   * include today) for dorms the user captains.
   */
  async getMyDormPendingToday(schoolId: string, userId: string) {
    const dorms = await this.prisma.dorm.findMany({
      where: { schoolId, captainUserId: userId },
      include: { schedules: true },
    });
    const today = new Date();
    const dow = today.getUTCDay(); // 0..6
    const occursOn = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
    );

    type Sched = {
      id: string;
      slot: string;
      timeOfDay: string;
      daysOfWeek: number[];
      allowsMessyRoomPoints: boolean;
    };

    const items: {
      dormId: string;
      dormName: string;
      slotId: string;
      slot: string;
      timeOfDay: string;
      allowsMessyRoomPoints: boolean;
      taken: boolean;
      rollCallId: string | null;
    }[] = [];

    for (const d of dorms) {
      for (const s of d.schedules as Sched[]) {
        if (!s.daysOfWeek.includes(dow)) continue;
        const slotRow = await this.prisma.dormRollCallSlot.findUnique({
          where: { scheduleId_occursOn: { scheduleId: s.id, occursOn } },
        });
        let rollCallId: string | null = null;
        if (slotRow) {
          const rc = await this.prisma.rollCall.findFirst({
            where: { dormSlotId: slotRow.id },
            select: { id: true },
          });
          rollCallId = rc?.id ?? null;
        }
        items.push({
          dormId: d.id,
          dormName: d.name,
          slotId: s.id,
          slot: s.slot,
          timeOfDay: s.timeOfDay,
          allowsMessyRoomPoints: s.allowsMessyRoomPoints,
          taken: rollCallId !== null,
          rollCallId,
        });
      }
    }
    items.sort((a, b) => a.timeOfDay.localeCompare(b.timeOfDay));
    return items;
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private async assertUserInSchool(schoolId: string, userId: string) {
    const u = await this.prisma.user.findFirst({
      where: { id: userId, schoolId },
      select: { id: true },
    });
    if (!u) throw new BadRequestException('User does not belong to this school');
  }
}
