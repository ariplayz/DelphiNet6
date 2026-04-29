import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { DashboardService } from './dashboard.service';
import { ClassesService } from '../classes/classes.service';
import { SaveLayoutDto } from './dto/save-layout.dto';
import {
  CreateQuickLinkDto,
  UpdateQuickLinkDto,
} from './dto/quick-link.dto';

@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly service: DashboardService,
    private readonly classes: ClassesService,
  ) {}

  @Get('layout')
  getLayout(@Req() req: Request) {
    return this.service.getLayout(req.user!.id);
  }

  @Put('layout')
  saveLayout(@Req() req: Request, @Body() dto: SaveLayoutDto) {
    return this.service.saveLayout(req.user!.id, dto.widgets);
  }

  @Get('quick-links')
  getQuickLinks(@Req() req: Request) {
    return this.service.getQuickLinks(req.user!.id);
  }

  @Post('quick-links')
  addQuickLink(@Req() req: Request, @Body() dto: CreateQuickLinkDto) {
    return this.service.addQuickLink(req.user!.id, dto);
  }

  @Patch('quick-links/:id')
  updateQuickLink(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateQuickLinkDto,
  ) {
    return this.service.updateQuickLink(id, req.user!.id, dto);
  }

  @Delete('quick-links/:id')
  deleteQuickLink(@Req() req: Request, @Param('id') id: string) {
    return this.service.deleteQuickLink(id, req.user!.id);
  }

  @Get('summary')
  getSummary(@Req() req: Request) {
    const schoolId = (req as any).schoolId as string;
    return this.service.getDashboardSummary(req.user!.id, schoolId);
  }

  @Get('today-classes')
  async getTodayClasses(@Req() req: Request) {
    const schoolId = (req as any).schoolId as string;
    const classes = await this.classes.getTodayClassesForUser(schoolId, req.user!.id);
    return { classes };
  }
}
