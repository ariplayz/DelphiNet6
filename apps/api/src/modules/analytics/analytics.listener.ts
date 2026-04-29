import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../database/prisma.service';
import { EventRegistry } from '@delphinet/shared-types';

@Injectable()
export class AnalyticsListener {
  constructor(private readonly prisma: PrismaService) {}

  @OnEvent('pageview.recorded')
  async handlePageview(payload: EventRegistry['pageview.recorded']): Promise<void> {
    await this.prisma.pageview.create({
      data: {
        userId: payload.userId,
        schoolId: payload.schoolId,
        path: payload.to,
        referrer: payload.from || null,
        ts: new Date(payload.ts),
      },
    });
  }
}
