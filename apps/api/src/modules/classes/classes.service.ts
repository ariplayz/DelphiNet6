import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { TypedEventEmitter } from '../event-bus/typed-event-emitter.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';

@Injectable()
export class ClassesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: TypedEventEmitter,
  ) {}

  private classInclude = {
    supervisor: {
      select: { id: true, firstName: true, lastName: true, email: true },
    },
    _count: {
      select: { enrollments: { where: { removedAt: null } } },
    },
  };

  async list(
    schoolId: string,
    opts: { supervisorId?: string; mineOnly?: boolean; userId?: string } = {},
  ) {
    const where: Record<string, unknown> = { schoolId };
    if (opts.supervisorId) where['supervisorUserId'] = opts.supervisorId;
    if (opts.mineOnly && opts.userId) {
      where['OR'] = [
        { supervisorUserId: opts.userId },
        { enrollments: { some: { studentUserId: opts.userId, removedAt: null } } },
      ];
    }
    return this.prisma.class.findMany({
      where,
      include: this.classInclude,
      orderBy: [{ name: 'asc' }],
    });
  }

  async get(schoolId: string, id: string) {
    const cls = await this.prisma.class.findFirst({
      where: { id, schoolId },
      include: {
        supervisor: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        enrollments: {
          where: { removedAt: null },
          include: {
            student: {
              select: { id: true, firstName: true, lastName: true, email: true, form: true },
            },
          },
          orderBy: [{ student: { lastName: 'asc' } }, { student: { firstName: 'asc' } }],
        },
        sessions: {
          where: { startsAt: { gte: new Date() } },
          orderBy: { startsAt: 'asc' },
          take: 10,
        },
      },
    });
    if (!cls) throw new NotFoundException(`Class ${id} not found`);
    return cls;
  }

  async create(schoolId: string, actorId: string, dto: CreateClassDto) {
    const cls = await this.prisma.class.create({
      data: {
        schoolId,
        name: dto.name,
        kind: dto.kind,
        notes: dto.notes,
        location: dto.location,
        supervisorUserId: dto.supervisorUserId,
      },
    });

    this.events.emit('class.created', { classId: cls.id, schoolId, createdBy: actorId });
    this.events.emit('audit.log', {
      userId: actorId,
      schoolId,
      action: 'class.created',
      entity: 'Class',
      entityId: cls.id,
    });
    return cls;
  }

  async update(schoolId: string, actorId: string, id: string, dto: UpdateClassDto) {
    const existing = await this.prisma.class.findFirst({ where: { id, schoolId } });
    if (!existing) throw new NotFoundException(`Class ${id} not found`);

    const cls = await this.prisma.class.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.kind !== undefined ? { kind: dto.kind } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        ...(dto.location !== undefined ? { location: dto.location } : {}),
        ...(dto.supervisorUserId !== undefined
          ? { supervisorUserId: dto.supervisorUserId }
          : {}),
      },
    });
    this.events.emit('class.updated', { classId: id, schoolId, updatedBy: actorId });
    this.events.emit('audit.log', {
      userId: actorId,
      schoolId,
      action: 'class.updated',
      entity: 'Class',
      entityId: id,
    });
    return cls;
  }

  async remove(schoolId: string, actorId: string, id: string) {
    const existing = await this.prisma.class.findFirst({ where: { id, schoolId } });
    if (!existing) throw new NotFoundException(`Class ${id} not found`);
    // Sessions and enrollments cascade per schema.
    await this.prisma.class.delete({ where: { id } });
    this.events.emit('class.deleted', { classId: id, schoolId, deletedBy: actorId });
    this.events.emit('audit.log', {
      userId: actorId,
      schoolId,
      action: 'class.deleted',
      entity: 'Class',
      entityId: id,
    });
    return { deleted: true };
  }

  async setRoster(schoolId: string, actorId: string, classId: string, userIds: string[]) {
    const existing = await this.prisma.class.findFirst({ where: { id: classId, schoolId } });
    if (!existing) throw new NotFoundException(`Class ${classId} not found`);

    const desired = new Set(userIds);

    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const current = await tx.classEnrollment.findMany({
        where: { classId, removedAt: null },
      });
      const currentIds = new Set(current.map((e: { studentUserId: string }) => e.studentUserId));

      const toRemove = current.filter(
        (e: { studentUserId: string }) => !desired.has(e.studentUserId),
      );
      const toAdd = userIds.filter((u) => !currentIds.has(u));

      if (toRemove.length > 0) {
        await tx.classEnrollment.updateMany({
          where: { id: { in: toRemove.map((e: { id: string }) => e.id) } },
          data: { removedAt: new Date() },
        });
      }
      for (const studentUserId of toAdd) {
        // Re-activate previously removed enrollment if exists.
        const prior = await tx.classEnrollment.findUnique({
          where: { classId_studentUserId: { classId, studentUserId } },
        });
        if (prior) {
          await tx.classEnrollment.update({
            where: { id: prior.id },
            data: { removedAt: null, addedBy: actorId, addedAt: new Date() },
          });
        } else {
          await tx.classEnrollment.create({
            data: { classId, studentUserId, addedBy: actorId },
          });
        }
      }

      for (const e of toRemove) {
        this.events.emit('class.enrollment.removed', {
          classId,
          studentUserId: e.studentUserId,
          schoolId,
          removedBy: actorId,
        });
      }
      for (const studentUserId of toAdd) {
        this.events.emit('class.enrollment.added', {
          classId,
          studentUserId,
          schoolId,
          addedBy: actorId,
        });
      }
    });

    return this.get(schoolId, classId);
  }

  async listSessions(
    schoolId: string,
    classId: string,
    opts: { from?: Date; to?: Date } = {},
  ) {
    const cls = await this.prisma.class.findFirst({ where: { id: classId, schoolId } });
    if (!cls) throw new NotFoundException(`Class ${classId} not found`);

    return this.prisma.classSession.findMany({
      where: {
        classId,
        ...(opts.from || opts.to
          ? {
              startsAt: {
                ...(opts.from ? { gte: opts.from } : {}),
                ...(opts.to ? { lt: opts.to } : {}),
              },
            }
          : {}),
      },
      orderBy: { startsAt: 'asc' },
    });
  }

  async addSession(schoolId: string, actorId: string, classId: string, dto: CreateSessionDto) {
    const cls = await this.prisma.class.findFirst({ where: { id: classId, schoolId } });
    if (!cls) throw new NotFoundException(`Class ${classId} not found`);

    const session = await this.prisma.classSession.create({
      data: {
        classId,
        startsAt: new Date(dto.startsAt),
        endsAt: new Date(dto.endsAt),
        recurrenceRule: dto.recurrenceRule,
      },
    });
    this.events.emit('class.session.created', {
      sessionId: session.id,
      classId,
      schoolId,
      createdBy: actorId,
    });
    return session;
  }

  async updateSession(
    schoolId: string,
    actorId: string,
    sessionId: string,
    dto: UpdateSessionDto,
  ) {
    const existing = await this.prisma.classSession.findUnique({
      where: { id: sessionId },
      include: { class: true },
    });
    if (!existing || existing.class.schoolId !== schoolId) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }
    const updated = await this.prisma.classSession.update({
      where: { id: sessionId },
      data: {
        ...(dto.startsAt ? { startsAt: new Date(dto.startsAt) } : {}),
        ...(dto.endsAt ? { endsAt: new Date(dto.endsAt) } : {}),
        ...(dto.recurrenceRule !== undefined ? { recurrenceRule: dto.recurrenceRule } : {}),
      },
    });
    this.events.emit('class.session.updated', {
      sessionId,
      classId: existing.classId,
      schoolId,
      updatedBy: actorId,
    });
    return updated;
  }

  async removeSession(schoolId: string, actorId: string, sessionId: string) {
    const existing = await this.prisma.classSession.findUnique({
      where: { id: sessionId },
      include: { class: true },
    });
    if (!existing || existing.class.schoolId !== schoolId) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }
    await this.prisma.classSession.delete({ where: { id: sessionId } });
    this.events.emit('class.session.deleted', {
      sessionId,
      classId: existing.classId,
      schoolId,
      deletedBy: actorId,
    });
    return { deleted: true };
  }

  async getMyClasses(schoolId: string, userId: string) {
    return this.prisma.class.findMany({
      where: {
        schoolId,
        OR: [
          { supervisorUserId: userId },
          { enrollments: { some: { studentUserId: userId, removedAt: null } } },
        ],
      },
      include: this.classInclude,
      orderBy: [{ name: 'asc' }],
    });
  }

  async getClassesISupervise(schoolId: string, userId: string) {
    return this.prisma.class.findMany({
      where: { schoolId, supervisorUserId: userId },
      include: this.classInclude,
      orderBy: [{ name: 'asc' }],
    });
  }

  /** Returns today's sessions (UTC day) for classes the user is in or supervises. */
  async getTodayClassesForUser(schoolId: string, userId: string) {
    const now = new Date();
    const dayStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const dayEnd = new Date(dayStart);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

    const sessions = await this.prisma.classSession.findMany({
      where: {
        startsAt: { gte: dayStart, lt: dayEnd },
        class: {
          schoolId,
          OR: [
            { supervisorUserId: userId },
            { enrollments: { some: { studentUserId: userId, removedAt: null } } },
          ],
        },
      },
      orderBy: { startsAt: 'asc' },
      include: {
        class: {
          select: { id: true, name: true, location: true, kind: true },
        },
      },
    });

    return sessions.map((s: typeof sessions[number]) => ({
      id: s.id,
      classId: s.classId,
      name: s.class.name,
      location: s.class.location ?? null,
      kind: s.class.kind,
      startsAt: s.startsAt.toISOString(),
      endsAt: s.endsAt.toISOString(),
    }));
  }

  /**
   * Returns sessions in [from, to) for classes the user is enrolled in or
   * supervises. Used by the /me/schedule page.
   */
  async getScheduleForUser(
    schoolId: string,
    userId: string,
    from: Date,
    to: Date,
  ) {
    const sessions = await this.prisma.classSession.findMany({
      where: {
        startsAt: { gte: from, lt: to },
        class: {
          schoolId,
          OR: [
            { supervisorUserId: userId },
            { enrollments: { some: { studentUserId: userId, removedAt: null } } },
          ],
        },
      },
      orderBy: { startsAt: 'asc' },
      include: {
        class: {
          select: { id: true, name: true, location: true, kind: true, supervisorUserId: true },
        },
      },
    });

    return sessions.map((s) => ({
      id: s.id,
      sourceId: s.classId,
      sourceType: 'class' as const,
      name: s.class.name,
      location: s.class.location ?? null,
      kind: s.class.kind as string,
      startsAt: s.startsAt.toISOString(),
      endsAt: s.endsAt.toISOString(),
      role: s.class.supervisorUserId === userId ? ('supervisor' as const) : ('attendee' as const),
    }));
  }
}
