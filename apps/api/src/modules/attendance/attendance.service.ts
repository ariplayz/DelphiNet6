import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { TypedEventEmitter } from '../event-bus/typed-event-emitter.service';
import {
  AttendanceStatusValue,
  POINTS,
  RESTRICTION_THRESHOLD,
} from './attendance.constants';
import { getCurrentWeekStart, getNextWeekStart } from './attendance.week';
import { SetEntryStatusDto, BulkEntryItemDto } from './dto/set-entry-status.dto';

const studentSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  form: true,
} as const;

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: TypedEventEmitter,
  ) {}

  /**
   * Idempotently open a roll call for a class session. Creates default HERE
   * entries for every active enrollment if no roll call exists yet.
   */
  async getOrCreateRollCall(
    schoolId: string,
    classSessionId: string,
    takenById: string,
  ) {
    const session = await this.prisma.classSession.findUnique({
      where: { id: classSessionId },
      include: { class: true },
    });
    if (!session || session.class.schoolId !== schoolId) {
      throw new NotFoundException(`Session ${classSessionId} not found`);
    }

    const existing = await this.prisma.rollCall.findFirst({
      where: { classSessionId },
    });
    if (existing) {
      return this.loadRollCallWithEntries(existing.id, schoolId);
    }

    const enrollments = await this.prisma.classEnrollment.findMany({
      where: { classId: session.classId, removedAt: null },
      select: { studentUserId: true },
    });

    const created = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Re-check inside the transaction to keep create idempotent under contention.
      const again = await tx.rollCall.findFirst({ where: { classSessionId } });
      if (again) return again;

      const rc = await tx.rollCall.create({
        data: {
          kind: 'CLASS',
          classSessionId,
          classId: session.classId,
          takenBy: takenById,
        },
      });

      if (enrollments.length > 0) {
        await tx.attendanceEntry.createMany({
          data: enrollments.map((e: { studentUserId: string }) => ({
            rollCallId: rc.id,
            studentUserId: e.studentUserId,
            status: 'HERE',
            pointsAwarded: POINTS.HERE,
            kind: 'attendance',
          })),
        });
      }

      return rc;
    });

    this.events.emit('attendance.roll_call_opened', {
      rollCallId: created.id,
      classId: session.classId,
      schoolId,
    });

    return this.loadRollCallWithEntries(created.id, schoolId);
  }

  private async loadRollCallWithEntries(rollCallId: string, schoolId: string) {
    const rc = await this.prisma.rollCall.findUnique({
      where: { id: rollCallId },
      include: {
        classSession: { include: { class: true } },
        entries: {
          include: { student: { select: studentSelect } },
          orderBy: [
            { student: { lastName: 'asc' } },
            { student: { firstName: 'asc' } },
          ],
        },
      },
    });
    if (!rc) throw new NotFoundException('Roll call not found');
    if (rc.classSession && rc.classSession.class.schoolId !== schoolId) {
      throw new NotFoundException('Roll call not found');
    }
    return rc;
  }

  /** Public API for "show me the roll call for this session". */
  async getRollCall(schoolId: string, classSessionId: string) {
    const rc = await this.prisma.rollCall.findFirst({
      where: { classSessionId },
    });
    if (!rc) throw new NotFoundException('Roll call not opened yet');
    return this.loadRollCallWithEntries(rc.id, schoolId);
  }

  /** True if the user supervises the class behind this entry. */
  private async assertCanAmend(
    entry: { rollCallId: string },
    user: { id: string; permissions: string[] },
  ): Promise<{ schoolId: string; rollCallId: string; classId: string | null }> {
    const rc = await this.prisma.rollCall.findUnique({
      where: { id: entry.rollCallId },
      include: {
        classSession: { include: { class: true } },
      },
    });
    if (!rc) throw new NotFoundException('Roll call not found');

    const cls = rc.classSession?.class ?? null;
    const isSupervisor = !!cls && cls.supervisorUserId === user.id;
    const canAmend = user.permissions.includes('attendance.amend');
    const isSuper = user.permissions.includes('super_admin.all');

    if (!isSupervisor && !canAmend && !isSuper) {
      throw new ForbiddenException('Not the supervisor of this class');
    }
    return {
      schoolId: cls?.schoolId ?? '',
      rollCallId: rc.id,
      classId: cls?.id ?? null,
    };
  }

  async setEntryStatus(
    user: { id: string; permissions: string[] },
    entryId: string,
    dto: SetEntryStatusDto,
  ) {
    const entry = await this.prisma.attendanceEntry.findUnique({
      where: { id: entryId },
    });
    if (!entry) throw new NotFoundException(`Entry ${entryId} not found`);

    await this.assertCanAmend(entry, user);

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
      include: { student: { select: studentSelect } },
    });

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

  async bulkSetEntries(
    user: { id: string; permissions: string[] },
    rollCallId: string,
    entries: BulkEntryItemDto[],
  ) {
    const rc = await this.prisma.rollCall.findUnique({
      where: { id: rollCallId },
      include: { entries: true, classSession: { include: { class: true } } },
    });
    if (!rc) throw new NotFoundException(`Roll call ${rollCallId} not found`);

    // Authorization: supervisor of the parent class OR has attendance.amend.
    const cls = rc.classSession?.class ?? null;
    const isSupervisor = !!cls && cls.supervisorUserId === user.id;
    const canAmend = user.permissions.includes('attendance.amend');
    const isSuper = user.permissions.includes('super_admin.all');
    if (!isSupervisor && !canAmend && !isSuper) {
      throw new ForbiddenException('Not the supervisor of this class');
    }

    type EntrySnapshot = {
      id: string;
      status: AttendanceStatusValue;
      pointsAwarded: number;
      studentUserId: string;
    };
    const byId = new Map<string, EntrySnapshot>(
      (rc.entries as EntrySnapshot[]).map((e) => [e.id, e]),
    );
    for (const item of entries) {
      const existing = byId.get(item.entryId);
      if (!existing) {
        throw new BadRequestException(`Entry ${item.entryId} is not part of this roll call`);
      }
      if (item.status === 'EXCUSED') {
        if (!item.excuseReason || item.excuseReason.trim() === '') {
          throw new BadRequestException(`excuseReason is required for entry ${item.entryId}`);
        }
      }
    }

    const results = await this.prisma.$transaction(
      entries.map((item) => {
        const newPoints = POINTS[item.status];
        return this.prisma.attendanceEntry.update({
          where: { id: item.entryId },
          data: {
            status: item.status,
            pointsAwarded: newPoints,
            excuseReason:
              item.status === 'EXCUSED' ? item.excuseReason!.trim() : null,
          },
        });
      }),
    );

    for (const updated of results) {
      const before = byId.get(updated.id)!;
      if (before.status !== updated.status || before.pointsAwarded !== updated.pointsAwarded) {
        this.events.emit('attendance.entry.changed', {
          entryId: updated.id,
          rollCallId: updated.rollCallId,
          studentUserId: updated.studentUserId,
          oldStatus: before.status,
          newStatus: updated.status,
          oldPoints: before.pointsAwarded,
          newPoints: updated.pointsAwarded,
          changedBy: user.id,
        });
      }
    }

    return this.loadRollCallWithEntries(rc.id, cls?.schoolId ?? '');
  }

  async getStudentWeeklyPoints(userId: string, weekStart?: Date): Promise<number> {
    const start = weekStart ?? getCurrentWeekStart();
    const agg = await this.prisma.attendanceEntry.aggregate({
      _sum: { pointsAwarded: true },
      where: {
        studentUserId: userId,
        createdAt: { gte: start },
      },
    });
    return agg._sum.pointsAwarded ?? 0;
  }

  /**
   * Per-week point history for the given student plus current-week breakdown.
   * Used by the My Attendance page to show recent weeks at a glance.
   */
  async getStudentPointSummary(userId: string, weeks = 12) {
    const currentStart = getCurrentWeekStart();
    const earliest = new Date(currentStart);
    earliest.setUTCDate(earliest.getUTCDate() - 7 * (weeks - 1));

    const entries = await this.prisma.attendanceEntry.findMany({
      where: { studentUserId: userId, createdAt: { gte: earliest } },
      orderBy: { createdAt: 'desc' },
      include: {
        rollCall: {
          select: {
            kind: true,
            classSession: {
              select: { class: { select: { id: true, name: true } } },
            },
          },
        },
      },
    });

    // Bucket by week (Tuesday-anchored).
    const buckets = new Map<string, { weekStart: string; total: number; entries: number }>();
    for (let i = 0; i < weeks; i++) {
      const ws = new Date(currentStart);
      ws.setUTCDate(ws.getUTCDate() - 7 * i);
      buckets.set(ws.toISOString(), { weekStart: ws.toISOString(), total: 0, entries: 0 });
    }
    for (const e of entries) {
      const ws = getCurrentWeekStart(e.createdAt);
      const key = ws.toISOString();
      const b = buckets.get(key);
      if (b) {
        b.total += e.pointsAwarded;
        b.entries += 1;
      }
    }

    const history = Array.from(buckets.values()).sort((a, b) =>
      a.weekStart < b.weekStart ? 1 : -1,
    );

    const currentWeek = history[0]?.total ?? 0;
    const recentEntries = entries.slice(0, 25).map((e) => ({
      id: e.id,
      status: e.status,
      points: e.pointsAwarded,
      reason: e.excuseReason ?? e.councilExcuseReason ?? null,
      verified: e.verificationStatus !== 'unverified',
      createdAt: e.createdAt.toISOString(),
      kind: e.rollCall.kind,
      className: e.rollCall.classSession?.class?.name ?? null,
      classId: e.rollCall.classSession?.class?.id ?? null,
    }));

    return {
      weekStart: currentStart.toISOString(),
      resetsAt: getNextWeekStart().toISOString(),
      restrictionThreshold: RESTRICTION_THRESHOLD,
      currentWeekPoints: currentWeek,
      restricted: currentWeek >= RESTRICTION_THRESHOLD,
      history,
      recentEntries,
    };
  }

  async getStudentRestrictionStatus(userId: string) {
    const weekStart = getCurrentWeekStart();
    const resetsAt = getNextWeekStart();
    const points = await this.getStudentWeeklyPoints(userId, weekStart);
    return {
      points,
      restricted: points >= RESTRICTION_THRESHOLD,
      restrictionThreshold: RESTRICTION_THRESHOLD,
      weekStart: weekStart.toISOString(),
      resetsAt: resetsAt.toISOString(),
    };
  }

  async getRestrictedStudents(schoolId: string) {
    const weekStart = getCurrentWeekStart();
    // Sum points per student this week, then filter.
    const grouped = await this.prisma.attendanceEntry.groupBy({
      by: ['studentUserId'],
      _sum: { pointsAwarded: true },
      where: {
        createdAt: { gte: weekStart },
        student: { schoolId },
      },
    });

    const restricted = grouped
      .map((g: { studentUserId: string; _sum: { pointsAwarded: number | null } }) => ({
        studentUserId: g.studentUserId,
        points: g._sum.pointsAwarded ?? 0,
      }))
      .filter((g: { points: number }) => g.points >= RESTRICTION_THRESHOLD);

    if (restricted.length === 0) return [];

    const [users, pendingByStudent] = await Promise.all([
      this.prisma.user.findMany({
        where: { id: { in: restricted.map((r: { studentUserId: string }) => r.studentUserId) } },
        select: studentSelect,
      }),
      this.countPendingVerificationByStudent(schoolId, weekStart),
    ]);
    const byId = new Map(users.map((u: { id: string }) => [u.id, u]));

    return restricted
      .map((r: { studentUserId: string; points: number }) => ({
        student: byId.get(r.studentUserId) ?? null,
        points: r.points,
        restricted: true,
        weekStart: weekStart.toISOString(),
        pendingVerificationCount: pendingByStudent.get(r.studentUserId) ?? 0,
      }))
      .filter((r: { student: unknown }) => r.student !== null)
      .sort(
        (a: { points: number }, b: { points: number }) => b.points - a.points,
      );
  }

  async getMyAttendanceHistory(
    userId: string,
    opts: { from?: Date; to?: Date } = {},
  ) {
    const where: Record<string, unknown> = {
      studentUserId: userId,
    };
    if (opts.from || opts.to) {
      where.createdAt = {
        ...(opts.from ? { gte: opts.from } : {}),
        ...(opts.to ? { lt: opts.to } : {}),
      };
    }

    return this.prisma.attendanceEntry.findMany({
      where,
      include: {
        rollCall: {
          include: {
            classSession: { include: { class: { select: { id: true, name: true } } } },
            class: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  /** Today's class sessions for classes the user supervises. */
  async getMyPendingRollCalls(schoolId: string, userId: string) {
    const now = new Date();
    const dayStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const dayEnd = new Date(dayStart);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

    const sessions = await this.prisma.classSession.findMany({
      where: {
        startsAt: { gte: dayStart, lt: dayEnd },
        class: { schoolId, supervisorUserId: userId },
      },
      orderBy: { startsAt: 'asc' },
      include: {
        class: { select: { id: true, name: true, location: true, kind: true } },
        rollCalls: { select: { id: true, takenAt: true, locked: true } },
      },
    });

    return sessions.map(
      (s: typeof sessions[number]) => ({
        sessionId: s.id,
        classId: s.classId,
        className: s.class.name,
        location: s.class.location,
        kind: s.class.kind,
        startsAt: s.startsAt.toISOString(),
        endsAt: s.endsAt.toISOString(),
        rollCallId: s.rollCalls[0]?.id ?? null,
        taken: s.rollCalls.length > 0,
      }),
    );
  }

  // ─── Phase 10: snapshot history ────────────────────────────────────────────

  async getUserSnapshots(userId: string, take = 26) {
    return this.prisma.weeklyPointSnapshot.findMany({
      where: { studentUserId: userId },
      orderBy: { weekStart: 'desc' },
      take,
    });
  }

  // ─── Phase 11: verification ────────────────────────────────────────────────

  /**
   * List entries that a student-council verifier should review. Defaults to
   * the current week and excludes already-verified rows.
   */
  async listEntriesForVerification(opts: {
    schoolId: string;
    weekStart?: Date;
    weekEnd?: Date;
    includeVerified?: boolean;
    limit?: number;
    offset?: number;
  }) {
    const weekStart = opts.weekStart ?? getCurrentWeekStart();
    const weekEnd = opts.weekEnd ?? getNextWeekStart(weekStart);
    const where: Record<string, unknown> = {
      createdAt: { gte: weekStart, lt: weekEnd },
      student: { schoolId: opts.schoolId },
    };
    if (!opts.includeVerified) {
      where.verificationStatus = 'unverified';
    }

    const entries = await this.prisma.attendanceEntry.findMany({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      where: where as any,
      include: {
        student: { select: studentSelect },
        verifier: { select: studentSelect },
        rollCall: {
          include: {
            classSession: {
              include: { class: { select: { id: true, name: true } } },
            },
            class: { select: { id: true, name: true } },
            takenByUser: { select: studentSelect },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: opts.limit ?? 100,
      skip: opts.offset ?? 0,
    });

    return entries;
  }

  async verifyEntry(entryId: string, verifierId: string) {
    const entry = await this.prisma.attendanceEntry.findUnique({
      where: { id: entryId },
    });
    if (!entry) throw new NotFoundException(`Entry ${entryId} not found`);

    const updated = await this.prisma.attendanceEntry.update({
      where: { id: entryId },
      data: {
        verificationStatus: 'verified',
        verifiedAt: new Date(),
        verifiedBy: verifierId,
      },
      include: {
        student: { select: studentSelect },
        verifier: { select: studentSelect },
      },
    });

    this.events.emit('attendance.entry.verified', {
      entryId: updated.id,
      verifierId,
    });

    return updated;
  }

  async excuseEntry(entryId: string, excuserId: string, reason: string) {
    if (!reason || reason.trim() === '') {
      throw new BadRequestException('reason is required');
    }
    const entry = await this.prisma.attendanceEntry.findUnique({
      where: { id: entryId },
    });
    if (!entry) throw new NotFoundException(`Entry ${entryId} not found`);

    const trimmed = reason.trim();
    const updated = await this.prisma.attendanceEntry.update({
      where: { id: entryId },
      data: {
        status: 'EXCUSED',
        pointsAwarded: POINTS.EXCUSED,
        excuseReason: trimmed,
        councilExcuseReason: trimmed,
        verificationStatus: 'excused_by_council',
        verifiedAt: new Date(),
        verifiedBy: excuserId,
      },
      include: {
        student: { select: studentSelect },
        verifier: { select: studentSelect },
      },
    });

    this.events.emit('attendance.entry.excused', {
      entryId: updated.id,
      excuserId,
      oldStatus: entry.status,
      oldPoints: entry.pointsAwarded,
      reason: trimmed,
    });
    // Also emit the generic change event so dashboards update.
    this.events.emit('attendance.entry.changed', {
      entryId: updated.id,
      rollCallId: updated.rollCallId,
      studentUserId: updated.studentUserId,
      oldStatus: entry.status,
      newStatus: updated.status,
      oldPoints: entry.pointsAwarded,
      newPoints: updated.pointsAwarded,
      changedBy: excuserId,
    });

    return updated;
  }

  /**
   * For the restriction list: count unverified entries per student in the
   * current week. Returns a Map<studentUserId, number>.
   */
  async countPendingVerificationByStudent(
    schoolId: string,
    weekStart: Date = getCurrentWeekStart(),
  ): Promise<Map<string, number>> {
    const grouped = await this.prisma.attendanceEntry.groupBy({
      by: ['studentUserId'],
      _count: { _all: true },
      where: {
        createdAt: { gte: weekStart },
        student: { schoolId },
        verificationStatus: 'unverified',
      },
    });
    return new Map(
      grouped.map(
        (g: { studentUserId: string; _count: { _all: number } }) => [
          g.studentUserId,
          g._count._all,
        ],
      ),
    );
  }

  /**
   * Class-supervisor overview: student roster + per-student point totals
   * (today, this week, last 30 days), plus latest entry status. Powers the
   * supervisor grid view on /classes/:id.
   */
  async getClassSupervisorOverview(classId: string) {
    const cls = await this.prisma.class.findUnique({
      where: { id: classId },
      select: { id: true, schoolId: true, name: true, supervisorUserId: true },
    });
    if (!cls) throw new NotFoundException(`Class ${classId} not found`);

    const enrollments = await this.prisma.classEnrollment.findMany({
      where: { classId, removedAt: null },
      include: { student: { select: studentSelect } },
      orderBy: [{ student: { lastName: 'asc' } }, { student: { firstName: 'asc' } }],
    });

    const studentIds = enrollments.map((e) => e.studentUserId);
    const weekStart = getCurrentWeekStart();
    const dayStart = new Date(); dayStart.setUTCHours(0, 0, 0, 0);
    const monthStart = new Date(); monthStart.setUTCDate(monthStart.getUTCDate() - 30);

    const [todayAgg, weekAgg, monthAgg, lastByStudent] = await Promise.all([
      this.prisma.attendanceEntry.groupBy({
        by: ['studentUserId'],
        _sum: { pointsAwarded: true },
        where: { studentUserId: { in: studentIds }, createdAt: { gte: dayStart } },
      }),
      this.prisma.attendanceEntry.groupBy({
        by: ['studentUserId'],
        _sum: { pointsAwarded: true },
        _count: { _all: true },
        where: { studentUserId: { in: studentIds }, createdAt: { gte: weekStart } },
      }),
      this.prisma.attendanceEntry.groupBy({
        by: ['studentUserId'],
        _sum: { pointsAwarded: true },
        where: { studentUserId: { in: studentIds }, createdAt: { gte: monthStart } },
      }),
      this.prisma.attendanceEntry.findMany({
        where: { studentUserId: { in: studentIds } },
        orderBy: { createdAt: 'desc' },
        distinct: ['studentUserId'],
        select: { studentUserId: true, status: true, pointsAwarded: true, verificationStatus: true, createdAt: true },
      }),
    ]);

    const map = (arr: { studentUserId: string; _sum: { pointsAwarded: number | null }; _count?: { _all: number } }[]) =>
      new Map(arr.map((g) => [g.studentUserId, { sum: g._sum.pointsAwarded ?? 0, count: g._count?._all ?? 0 }]));
    const today = map(todayAgg);
    const week = map(weekAgg);
    const month = map(monthAgg);
    const last = new Map(lastByStudent.map((e) => [e.studentUserId, e]));

    const students = enrollments.map((e) => {
      const wk = week.get(e.studentUserId) ?? { sum: 0, count: 0 };
      const td = today.get(e.studentUserId) ?? { sum: 0, count: 0 };
      const mo = month.get(e.studentUserId) ?? { sum: 0, count: 0 };
      const lst = last.get(e.studentUserId) ?? null;
      return {
        student: e.student,
        pointsToday: td.sum,
        pointsThisWeek: wk.sum,
        pointsLast30Days: mo.sum,
        weekEntries: wk.count,
        restricted: wk.sum >= RESTRICTION_THRESHOLD,
        lastEntry: lst
          ? {
              status: lst.status,
              points: lst.pointsAwarded,
              verified: lst.verificationStatus !== 'unverified',
              at: lst.createdAt.toISOString(),
            }
          : null,
      };
    });

    return {
      classId: cls.id,
      className: cls.name,
      weekStart: weekStart.toISOString(),
      restrictionThreshold: RESTRICTION_THRESHOLD,
      totals: {
        todayPoints: students.reduce((a, s) => a + s.pointsToday, 0),
        weekPoints: students.reduce((a, s) => a + s.pointsThisWeek, 0),
        restrictedCount: students.filter((s) => s.restricted).length,
        studentCount: students.length,
      },
      students,
    };
  }
}
