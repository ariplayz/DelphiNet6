import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateEthicsReportDto } from './dto/create-ethics-report.dto';
import { ReviewEthicsReportDto } from './dto/review-ethics-report.dto';

const userSelect = {
  id: true,
  firstName: true,
  lastName: true,
} as const;

@Injectable()
export class EthicsService {
  constructor(private readonly prisma: PrismaService) {}

  listMine(schoolId: string, userId: string) {
    return this.prisma.ethicsReport.findMany({
      where: { schoolId, writerId: userId },
      include: {
        writer: { select: userSelect },
        subject: { select: userSelect },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  listCampus(schoolId: string) {
    return this.prisma.ethicsReport.findMany({
      where: { schoolId },
      include: {
        writer: { select: userSelect },
        subject: { select: userSelect },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  create(schoolId: string, writerId: string, dto: CreateEthicsReportDto) {
    return this.prisma.ethicsReport.create({
      data: {
        schoolId,
        writerId,
        subjectId: dto.subjectId,
        body: dto.body,
      },
      include: {
        writer: { select: userSelect },
        subject: { select: userSelect },
      },
    });
  }

  async review(
    schoolId: string,
    reportId: string,
    reviewerId: string,
    dto: ReviewEthicsReportDto,
  ) {
    const report = await this.prisma.ethicsReport.findFirst({
      where: { id: reportId, schoolId },
    });
    if (!report) throw new NotFoundException(`Ethics report ${reportId} not found`);

    return this.prisma.ethicsReport.update({
      where: { id: reportId },
      data: {
        status: dto.status,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        reviewNotes: dto.reviewNotes ?? null,
      },
      include: {
        writer: { select: userSelect },
        subject: { select: userSelect },
      },
    });
  }
}
