import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { WidgetDto } from './dto/save-layout.dto';
import {
  CreateQuickLinkDto,
  UpdateQuickLinkDto,
} from './dto/quick-link.dto';

const DEFAULT_LAYOUT: WidgetDto[] = [
  { id: 'welcome', type: 'welcome', x: 0, y: 0, w: 12, h: 2 },
  { id: 'summary', type: 'attendance-summary', x: 0, y: 2, w: 6, h: 3 },
  { id: 'quicklinks', type: 'quick-links', x: 6, y: 2, w: 6, h: 3 },
  { id: 'todayclasses', type: 'today-classes', x: 0, y: 5, w: 12, h: 4 },
];

const RESTRICTION_THRESHOLD = 4;

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getLayout(userId: string): Promise<{ widgets: WidgetDto[] }> {
    const row = await this.prisma.widgetLayout.findUnique({
      where: { userId_breakpoint: { userId, breakpoint: 'lg' } },
    });
    if (!row) return { widgets: DEFAULT_LAYOUT };
    const widgets = Array.isArray(row.layout)
      ? (row.layout as unknown as WidgetDto[])
      : DEFAULT_LAYOUT;
    return { widgets };
  }

  async saveLayout(
    userId: string,
    widgets: WidgetDto[],
  ): Promise<{ widgets: WidgetDto[] }> {
    await this.prisma.widgetLayout.upsert({
      where: { userId_breakpoint: { userId, breakpoint: 'lg' } },
      create: {
        userId,
        breakpoint: 'lg',
        layout: widgets as unknown as object,
      },
      update: { layout: widgets as unknown as object },
    });
    return { widgets };
  }

  async getQuickLinks(userId: string) {
    const links = await this.prisma.quickLink.findMany({
      where: { userId },
      orderBy: [{ position: 'asc' }, { label: 'asc' }],
    });
    return links.map((l: typeof links[number]) => ({
      id: l.id,
      label: l.label,
      url: l.url,
      sortOrder: l.position,
    }));
  }

  async addQuickLink(userId: string, dto: CreateQuickLinkDto) {
    let position = dto.sortOrder;
    if (position === undefined) {
      const last = await this.prisma.quickLink.findFirst({
        where: { userId },
        orderBy: { position: 'desc' },
      });
      position = last ? last.position + 1 : 0;
    }
    const link = await this.prisma.quickLink.create({
      data: { userId, label: dto.label, url: dto.url, position },
    });
    return { id: link.id, label: link.label, url: link.url, sortOrder: link.position };
  }

  async updateQuickLink(id: string, userId: string, dto: UpdateQuickLinkDto) {
    const existing = await this.prisma.quickLink.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Quick link not found');
    if (existing.userId !== userId) throw new ForbiddenException();
    const link = await this.prisma.quickLink.update({
      where: { id },
      data: {
        ...(dto.label !== undefined ? { label: dto.label } : {}),
        ...(dto.url !== undefined ? { url: dto.url } : {}),
        ...(dto.sortOrder !== undefined ? { position: dto.sortOrder } : {}),
      },
    });
    return { id: link.id, label: link.label, url: link.url, sortOrder: link.position };
  }

  async deleteQuickLink(id: string, userId: string) {
    const existing = await this.prisma.quickLink.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Quick link not found');
    if (existing.userId !== userId) throw new ForbiddenException();
    await this.prisma.quickLink.delete({ where: { id } });
    return { ok: true };
  }

  /**
   * Returns next Tuesday 00:00 UTC after `from`. If `from` is a Tuesday, returns
   * the following Tuesday (one full week away).
   */
  private nextTuesday(from: Date): Date {
    const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
    const dow = d.getUTCDay(); // 0 Sun .. 6 Sat. Tuesday = 2
    const daysUntilNextTue = ((2 - dow + 7) % 7) || 7;
    d.setUTCDate(d.getUTCDate() + daysUntilNextTue);
    return d;
  }

  /** Returns the most recent Tuesday 00:00 UTC at or before `from`. */
  private weekStart(from: Date): Date {
    const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
    const dow = d.getUTCDay();
    const daysSinceTue = (dow - 2 + 7) % 7;
    d.setUTCDate(d.getUTCDate() - daysSinceTue);
    return d;
  }

  async getDashboardSummary(userId: string, schoolId: string) {
    const now = new Date();
    const weekStart = this.weekStart(now);
    const nextReset = this.nextTuesday(now);

    const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const dayEnd = new Date(dayStart);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

    const [todayClassesCount, weeklyPointsAgg, snapshot, pendingRoutingForms] =
      await Promise.all([
        this.prisma.classSession.count({
          where: {
            startsAt: { gte: dayStart, lt: dayEnd },
            class: {
              schoolId,
              enrollments: {
                some: { studentUserId: userId, removedAt: null },
              },
            },
          },
        }),
        this.prisma.attendanceEntry.aggregate({
          _sum: { pointsAwarded: true },
          where: {
            studentUserId: userId,
            createdAt: { gte: weekStart },
          },
        }),
        this.prisma.weeklyPointSnapshot.findUnique({
          where: {
            schoolId_studentUserId_weekStart: {
              schoolId,
              studentUserId: userId,
              weekStart,
            },
          },
        }),
        this.prisma.routingForm.count({
          where: {
            schoolId,
            assignedTo: userId,
            status: { not: 'completed' },
          },
        }),
      ]);

    const weeklyPoints = snapshot?.points ?? weeklyPointsAgg._sum.pointsAwarded ?? 0;
    const restricted =
      snapshot?.restricted ?? weeklyPoints >= RESTRICTION_THRESHOLD;

    return {
      todayClassesCount,
      weeklyPoints,
      restrictionThreshold: RESTRICTION_THRESHOLD,
      restricted,
      pendingRoutingForms,
      unreadNotifications: 0,
      weekStart: weekStart.toISOString(),
      nextReset: nextReset.toISOString(),
    };
  }
}
