import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { CollegeAppsService } from './college-apps.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';

@Controller('college-applications')
export class CollegeAppsController {
  constructor(private readonly service: CollegeAppsService) {}

  @Get()
  getMyApplications(@Req() req: Request) {
    const userId = (req.user as any).id as string;
    const schoolId = (req as any).schoolId as string;
    return this.service.getMyApplications(schoolId, userId);
  }

  @Post()
  create(@Req() req: Request, @Body() dto: CreateApplicationDto) {
    const userId = (req.user as any).id as string;
    const schoolId = (req as any).schoolId as string;
    return this.service.create(schoolId, userId, dto);
  }

  @Patch(':id')
  update(@Req() req: Request, @Param('id') id: string, @Body() dto: UpdateApplicationDto) {
    const userId = (req.user as any).id as string;
    const schoolId = (req as any).schoolId as string;
    return this.service.update(schoolId, id, userId, dto);
  }

  @Delete(':id')
  remove(@Req() req: Request, @Param('id') id: string) {
    const userId = (req.user as any).id as string;
    const schoolId = (req as any).schoolId as string;
    return this.service.remove(schoolId, id, userId);
  }
}
