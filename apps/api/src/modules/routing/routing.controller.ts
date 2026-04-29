import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { RequirePermission } from '../auth/require-permission.decorator';
import { RoutingService } from './routing.service';
import { CreateRoutingFormDto } from './dto/create-routing-form.dto';
import { UpdateRoutingFormDto } from './dto/update-routing-form.dto';

@Controller('routing')
export class RoutingController {
  constructor(private readonly service: RoutingService) {}

  @Get('inbox')
  getInbox(@Req() req: Request) {
    const schoolId = (req as any).schoolId as string;
    const user = req.user as any;
    return this.service.getInbox(schoolId, user.id);
  }

  @Get('started')
  getStarted(@Req() req: Request) {
    const schoolId = (req as any).schoolId as string;
    const user = req.user as any;
    return this.service.getStarted(schoolId, user.id);
  }

  @Get('lookup')
  @RequirePermission('students.view_all')
  lookup(
    @Req() req: Request,
    @Query('studentId') studentId?: string,
    @Query('q') q?: string,
  ) {
    const schoolId = (req as any).schoolId as string;
    return this.service.lookup(schoolId, { studentId, q });
  }

  @Post()
  create(@Req() req: Request, @Body() dto: CreateRoutingFormDto) {
    const schoolId = (req as any).schoolId as string;
    const user = req.user as any;
    return this.service.create(schoolId, user.id, dto);
  }

  @Patch(':id')
  update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateRoutingFormDto,
  ) {
    const schoolId = (req as any).schoolId as string;
    const user = req.user as any;
    return this.service.update(schoolId, id, user.id, dto);
  }
}
