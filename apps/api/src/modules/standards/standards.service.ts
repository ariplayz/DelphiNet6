import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateCramDto } from './dto/create-cram.dto';
import { CreateStoryDto } from './dto/create-story.dto';

@Injectable()
export class StandardsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── CRAM Assignments ────────────────────────────────────────────────────

  getMyCramAssignments(schoolId: string, userId: string) {
    return this.prisma.cramAssignment.findMany({
      where: { schoolId, studentUserId: userId },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  createCram(schoolId: string, actorId: string, dto: CreateCramDto) {
    return this.prisma.cramAssignment.create({
      data: {
        schoolId,
        assignedBy: actorId,
        studentUserId: dto.studentUserId,
        subject: dto.subject,
        description: dto.description ?? null,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
      },
    });
  }

  async completeCram(schoolId: string, cramId: string, userId: string) {
    const assignment = await this.prisma.cramAssignment.findFirst({
      where: { id: cramId, schoolId, studentUserId: userId },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');

    return this.prisma.cramAssignment.update({
      where: { id: cramId },
      data: { completedAt: new Date() },
    });
  }

  // ─── Success Stories ─────────────────────────────────────────────────────

  getMySuccessStories(schoolId: string, userId: string) {
    return this.prisma.successStory.findMany({
      where: { schoolId, studentUserId: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  createStory(schoolId: string, userId: string, dto: CreateStoryDto) {
    return this.prisma.successStory.create({
      data: {
        schoolId,
        studentUserId: userId,
        title: dto.title,
        body: dto.body,
        verifiedBy: null,
        verifiedAt: null,
      },
    });
  }

  getPendingStories(schoolId: string) {
    return this.prisma.successStory.findMany({
      where: { schoolId, verifiedAt: null },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async verifyStory(schoolId: string, storyId: string, verifierId: string) {
    const story = await this.prisma.successStory.findFirst({
      where: { id: storyId, schoolId },
    });
    if (!story) throw new NotFoundException('Story not found');

    return this.prisma.successStory.update({
      where: { id: storyId },
      data: { verifiedAt: new Date(), verifiedBy: verifierId },
    });
  }
}
