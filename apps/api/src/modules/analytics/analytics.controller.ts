import { Controller, Get, Query, Req } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RequirePermission } from '../auth/require-permission.decorator';
import { Request } from 'express';

@Controller('api/analytics')
export class AnalyticsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('pageviews')
  @RequirePermission('analytics.view')
  async getPageviews(
    @Req() req: Request,
    @Query('days') daysParam?: string,
  ) {
    const days = daysParam ? parseInt(daysParam, 10) : 7;
    const schoolId = (req as any).schoolId as string;

    const since = new Date();
    since.setDate(since.getDate() - days);

    const rows = await this.prisma.pageview.findMany({
      where: { schoolId, ts: { gte: since } },
      select: { path: true, ts: true },
      orderBy: { ts: 'asc' },
    });

    // Group by page (path)
    const grouped: Record<string, { path: string; count: number }> = {};
    for (const row of rows) {
      if (!grouped[row.path]) {
        grouped[row.path] = { path: row.path, count: 0 };
      }
      grouped[row.path].count++;
    }

    return Object.values(grouped).sort((a, b) => b.count - a.count);
  }

  @Get('stats')
  @RequirePermission('analytics.view')
  async getStats(@Req() req: Request) {
    const schoolId = (req as any).schoolId as string;

    const since = new Date();
    since.setDate(since.getDate() - 7);

    const [totalUsers, totalRoles, totalClasses, pageviewRows] = await Promise.all([
      this.prisma.user.count({ where: { schoolId } }),
      this.prisma.role.count({ where: { OR: [{ schoolId }, { schoolId: null }] } }),
      this.prisma.class.count({ where: { schoolId } }),
      this.prisma.pageview.findMany({
        where: { schoolId, ts: { gte: since } },
        select: { path: true },
      }),
    ]);

    const pathCounts: Record<string, number> = {};
    for (const row of pageviewRows) {
      pathCounts[row.path] = (pathCounts[row.path] ?? 0) + 1;
    }

    const topPages = Object.entries(pathCounts)
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return { totalUsers, totalRoles, totalClasses, topPages };
  }
}
