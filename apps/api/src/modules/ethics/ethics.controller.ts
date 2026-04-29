import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { RequirePermission } from '../auth/require-permission.decorator';
import { EthicsService } from './ethics.service';
import { CreateEthicsReportDto } from './dto/create-ethics-report.dto';
import { ReviewEthicsReportDto } from './dto/review-ethics-report.dto';

@Controller('ethics')
export class EthicsController {
  constructor(private readonly service: EthicsService) {}

  @Get('mine')
  listMine(@Req() req: Request) {
    const schoolId = (req as any).schoolId as string;
    return this.service.listMine(schoolId, req.user!.id);
  }

  @Post()
  create(@Req() req: Request, @Body() dto: CreateEthicsReportDto) {
    const schoolId = (req as any).schoolId as string;
    return this.service.create(schoolId, req.user!.id, dto);
  }

  @Get('campus')
  @RequirePermission('ethics.review')
  listCampus(@Req() req: Request) {
    const schoolId = (req as any).schoolId as string;
    return this.service.listCampus(schoolId);
  }

  @Patch(':id/review')
  @RequirePermission('ethics.review')
  review(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: ReviewEthicsReportDto,
  ) {
    const schoolId = (req as any).schoolId as string;
    return this.service.review(schoolId, id, req.user!.id, dto);
  }
}
