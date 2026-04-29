import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateRoutingFormDto } from './dto/create-routing-form.dto';
import { UpdateRoutingFormDto } from './dto/update-routing-form.dto';

const userSelect = {
  id: true,
  firstName: true,
  lastName: true,
} as const;

@Injectable()
export class RoutingService {
  constructor(private readonly prisma: PrismaService) {}

  getInbox(schoolId: string, userId: string) {
    return this.prisma.routingForm.findMany({
      where: {
        schoolId,
        assignedTo: userId,
        status: { not: 'completed' },
      },
      include: {
        starter: { select: userSelect },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  getStarted(schoolId: string, userId: string) {
    return this.prisma.routingForm.findMany({
      where: { schoolId, startedBy: userId },
      include: {
        assignee: { select: userSelect },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  create(schoolId: string, userId: string, dto: CreateRoutingFormDto) {
    return this.prisma.routingForm.create({
      data: {
        schoolId,
        startedBy: userId,
        subject: dto.subject,
        description: dto.description,
        assignedTo: dto.assignedTo,
        status: 'open',
      },
      include: {
        starter: { select: userSelect },
        assignee: { select: userSelect },
      },
    });
  }

  async update(
    schoolId: string,
    formId: string,
    userId: string,
    dto: UpdateRoutingFormDto,
  ) {
    const form = await this.prisma.routingForm.findFirst({
      where: { id: formId, schoolId },
    });
    if (!form) throw new NotFoundException('Routing form not found');
    if (form.startedBy !== userId && form.assignedTo !== userId) {
      throw new ForbiddenException('You are not a participant in this route');
    }

    const data: any = {};
    if (dto.status !== undefined) {
      data.status = dto.status;
      if (dto.status === 'completed') data.completedAt = new Date();
    }
    if (dto.assignedTo !== undefined) data.assignedTo = dto.assignedTo;
    if (dto.description !== undefined) data.description = dto.description;

    return this.prisma.routingForm.update({
      where: { id: formId },
      data,
      include: {
        starter: { select: userSelect },
        assignee: { select: userSelect },
      },
    });
  }

  lookup(
    schoolId: string,
    opts: { studentId?: string; q?: string },
  ) {
    const where: any = { schoolId };

    if (opts.studentId) {
      where.OR = [
        { startedBy: opts.studentId },
        { assignedTo: opts.studentId },
      ];
    }

    if (opts.q) {
      const subjectFilter = {
        subject: { contains: opts.q, mode: 'insensitive' as const },
      };
      if (where.OR) {
        where.AND = [{ OR: where.OR }, subjectFilter];
        delete where.OR;
      } else {
        Object.assign(where, subjectFilter);
      }
    }

    return this.prisma.routingForm.findMany({
      where,
      include: {
        starter: { select: userSelect },
        assignee: { select: userSelect },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
