import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';

@Injectable()
export class CollegeAppsService {
  constructor(private readonly prisma: PrismaService) {}

  getMyApplications(schoolId: string, userId: string) {
    return this.prisma.collegeApplication.findMany({
      where: { schoolId, studentUserId: userId },
      orderBy: [{ deadline: 'asc' }, { collegeName: 'asc' }],
    });
  }

  create(schoolId: string, userId: string, dto: CreateApplicationDto) {
    return this.prisma.collegeApplication.create({
      data: {
        schoolId,
        studentUserId: userId,
        collegeName: dto.collegeName,
        status: 'researching',
        notes: dto.notes,
        deadline: dto.deadline ? new Date(dto.deadline) : undefined,
      },
    });
  }

  async update(schoolId: string, appId: string, userId: string, dto: UpdateApplicationDto) {
    const app = await this.prisma.collegeApplication.findFirst({
      where: { id: appId, studentUserId: userId, schoolId },
    });
    if (!app) throw new NotFoundException(`College application ${appId} not found`);

    return this.prisma.collegeApplication.update({
      where: { id: appId },
      data: {
        ...(dto.collegeName !== undefined && { collegeName: dto.collegeName }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.deadline !== undefined && { deadline: dto.deadline ? new Date(dto.deadline) : null }),
      },
    });
  }

  async remove(schoolId: string, appId: string, userId: string) {
    const app = await this.prisma.collegeApplication.findFirst({
      where: { id: appId, studentUserId: userId, schoolId },
    });
    if (!app) throw new NotFoundException(`College application ${appId} not found`);

    return this.prisma.collegeApplication.delete({ where: { id: appId } });
  }
}
