import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { RequirePermission } from '../auth/require-permission.decorator';
import { CreateCramDto } from './dto/create-cram.dto';
import { CreateStoryDto } from './dto/create-story.dto';
import { StandardsService } from './standards.service';

function schoolOf(req: Request): string {
  return (req as unknown as { schoolId: string }).schoolId;
}

@Controller('standards')
export class StandardsController {
  constructor(private readonly service: StandardsService) {}

  // ─── CRAM ────────────────────────────────────────────────────────────────

  @Get('cram')
  getMyCram(@Req() req: Request) {
    return this.service.getMyCramAssignments(schoolOf(req), req.user!.id);
  }

  @Post('cram')
  @RequirePermission('cram.assign')
  createCram(@Req() req: Request, @Body() dto: CreateCramDto) {
    return this.service.createCram(schoolOf(req), req.user!.id, dto);
  }

  @Post('cram/:id/complete')
  completeCram(@Req() req: Request, @Param('id') id: string) {
    return this.service.completeCram(schoolOf(req), id, req.user!.id);
  }

  // ─── Success Stories ─────────────────────────────────────────────────────

  @Get('success-stories')
  getMyStories(@Req() req: Request) {
    return this.service.getMySuccessStories(schoolOf(req), req.user!.id);
  }

  @Post('success-stories')
  createStory(@Req() req: Request, @Body() dto: CreateStoryDto) {
    return this.service.createStory(schoolOf(req), req.user!.id, dto);
  }

  @Get('success-stories/pending')
  @RequirePermission('success_story.verify')
  getPendingStories(@Req() req: Request) {
    return this.service.getPendingStories(schoolOf(req));
  }

  @Post('success-stories/:id/verify')
  @RequirePermission('success_story.verify')
  verifyStory(@Req() req: Request, @Param('id') id: string) {
    return this.service.verifyStory(schoolOf(req), id, req.user!.id);
  }
}
