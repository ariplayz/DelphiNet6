import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../database/prisma.service';
import { EventRegistry } from '@delphinet/shared-types';

@Injectable()
export class AuditListener {
  constructor(private readonly prisma: PrismaService) {}

  @OnEvent('audit.log')
  async handleAuditLog(payload: EventRegistry['audit.log']): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userId: payload.userId,
        schoolId: payload.schoolId,
        event: payload.action,
        payload: {
          entity: payload.entity,
          entityId: payload.entityId,
          ...(payload.meta ?? {}),
        },
      },
    });
  }
}
