import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { TypedEventEmitter } from '../event-bus/typed-event-emitter.service';
import { CreateSeminarDto } from './dto/create-seminar.dto';
import { UpdateSeminarDto } from './dto/update-seminar.dto';
import { RecordSeminarAttendanceDto } from './dto/record-attendance.dto';

@Injectable()
export class SeminarsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: TypedEventEmitter,
  ) {}

  private include = {
    leader: { select: { id: true, firstName: true, lastName: true, email: true } },
    _count: { select: { enrollments: { where: { removedAt: null } } } },
  } as const;

  list(schoolId: string, opts: { includeArchived?: boolean } = {}) {
    return this.prisma.seminar.findMany({
      where: { schoolId, ...(opts.includeArchived ? {} : { isArchived: false }) },
      include: this.include,
      orderBy: { name: 'asc' },
    });
  }

  ledBy(userId: string) {
    return this.prisma.seminar.findMany({
      where: { leaderUserId: userId, isArchived: false },
      include: this.include,
      orderBy: { name: 'asc' },
    });
  }

  enrolledFor(userId: string) {
    return this.prisma.seminar.findMany({
      where: {
        isArchived: false,
        enrollments: { some: { studentUserId: userId, removedAt: null } },
      },
      include: this.include,
      orderBy: { name: 'asc' },
    });
  }

  async get(schoolId: string, id: string) {
    const s = await this.prisma.seminar.findFirst({
      where: { id, schoolId },
      include: {
        leader: { select: { id: true, firstName: true, lastName: true, email: true } },
        enrollments: {
          where: { removedAt: null },
          include: {
            student: { select: { id: true, firstName: true, lastName: true, form: true } },
          },
          orderBy: [{ student: { lastName: 'asc' } }, { student: { firstName: 'asc' } }],
        },
        sessions: {
          orderBy: { startsAt: 'asc' },
          where: { startsAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
          take: 20,
        },
      },
    });
    if (!s) throw new NotFoundException(`Seminar ${id} not found`);
    return s;
  }

  async create(schoolId: string, actorId: string, dto: CreateSeminarDto) {
    const s = await this.prisma.seminar.create({
      data: { schoolId, ...dto },
    });
    this.events.emit('audit.log', {
      userId: actorId,
      schoolId,
      action: 'seminar.created',
      entity: 'Seminar',
      entityId: s.id,
    });
    return s;
  }

  async update(schoolId: string, actorId: string, id: string, dto: UpdateSeminarDto) {
    const existing = await this.prisma.seminar.findFirst({ where: { id, schoolId } });
    if (!existing) throw new NotFoundException(`Seminar ${id} not found`);
    const s = await this.prisma.seminar.update({ where: { id }, data: dto });
    this.events.emit('audit.log', {
      userId: actorId,
      schoolId,
      action: 'seminar.updated',
      entity: 'Seminar',
      entityId: id,
    });
    return s;
  }

  async remove(schoolId: string, actorId: string, id: string) {
    const existing = await this.prisma.seminar.findFirst({ where: { id, schoolId } });
    if (!existing) throw new NotFoundException(`Seminar ${id} not found`);
    await this.prisma.seminar.delete({ where: { id } });
    this.events.emit('audit.log', {
      userId: actorId,
      schoolId,
      action: 'seminar.deleted',
      entity: 'Seminar',
      entityId: id,
    });
    return { ok: true };
  }

  async setRoster(schoolId: string, actorId: string, seminarId: string, studentIds: string[]) {
    const seminar = await this.prisma.seminar.findFirst({ where: { id: seminarId, schoolId } });
    if (!seminar) throw new NotFoundException(`Seminar ${seminarId} not found`);

    const existing = await this.prisma.seminarEnrollment.findMany({
      where: { seminarId, removedAt: null },
    });
    const existingIds = new Set(existing.map((e) => e.studentUserId));
    const target = new Set(studentIds);

    const toRemove = existing.filter((e) => !target.has(e.studentUserId));
    const toAdd = studentIds.filter((id) => !existingIds.has(id));

    await this.prisma.$transaction([
      ...toRemove.map((e) =>
        this.prisma.seminarEnrollment.update({
          where: { id: e.id },
          data: { removedAt: new Date() },
        }),
      ),
      ...toAdd.map((id) =>
        this.prisma.seminarEnrollment.upsert({
          where: { seminarId_studentUserId: { seminarId, studentUserId: id } },
          update: { removedAt: null, addedBy: actorId, addedAt: new Date() },
          create: { seminarId, studentUserId: id, addedBy: actorId },
        }),
      ),
    ]);

    return this.get(schoolId, seminarId);
  }

  /** Returns or creates today's session for a seminar (leader convenience). */
  async getOrCreateTodaySession(schoolId: string, seminarId: string) {
    const seminar = await this.prisma.seminar.findFirst({ where: { id: seminarId, schoolId } });
    if (!seminar) throw new NotFoundException(`Seminar ${seminarId} not found`);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    let session = await this.prisma.seminarSession.findFirst({
      where: { seminarId, startsAt: { gte: today, lt: tomorrow } },
    });
    if (session) return session;

    const [hh, mm] = seminar.startsAt.split(':').map((x) => parseInt(x, 10));
    const startsAt = new Date(today);
    startsAt.setHours(hh || 0, mm || 0, 0, 0);
    const endsAt = new Date(startsAt.getTime() + seminar.durationMinutes * 60 * 1000);

    session = await this.prisma.seminarSession.create({
      data: { seminarId, startsAt, endsAt },
    });
    return session;
  }

  async assertCanRecord(schoolId: string, seminarId: string, userId: string, perms: string[]) {
    const seminar = await this.prisma.seminar.findFirst({ where: { id: seminarId, schoolId } });
    if (!seminar) throw new NotFoundException(`Seminar ${seminarId} not found`);
    const isLeader = seminar.leaderUserId === userId;
    const canManage = perms.includes('seminar.manage');
    if (!isLeader && !canManage) {
      throw new ForbiddenException('Only the seminar leader or an admin can record attendance');
    }
    return seminar;
  }

  async recordAttendance(
    schoolId: string,
    actorId: string,
    seminarId: string,
    sessionId: string,
    dto: RecordSeminarAttendanceDto,
  ) {
    const session = await this.prisma.seminarSession.findFirst({ where: { id: sessionId, seminarId } });
    if (!session) throw new NotFoundException(`Session ${sessionId} not found`);

    await this.prisma.$transaction(
      dto.entries.map((entry) =>
        this.prisma.seminarAttendance.upsert({
          where: { sessionId_studentUserId: { sessionId, studentUserId: entry.studentUserId } },
          update: {
            status: entry.status,
            excuseReason: entry.excuseReason ?? null,
            recordedBy: actorId,
            recordedAt: new Date(),
          },
          create: {
            sessionId,
            studentUserId: entry.studentUserId,
            status: entry.status,
            excuseReason: entry.excuseReason ?? null,
            recordedBy: actorId,
          },
        }),
      ),
    );

    this.events.emit('audit.log', {
      userId: actorId,
      schoolId,
      action: 'seminar.attendance.recorded',
      entity: 'SeminarSession',
      entityId: sessionId,
    });

    return this.prisma.seminarAttendance.findMany({
      where: { sessionId },
      include: { student: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  getSessionAttendance(sessionId: string) {
    return this.prisma.seminarAttendance.findMany({
      where: { sessionId },
      include: { student: { select: { id: true, firstName: true, lastName: true } } },
    });
  }
}
