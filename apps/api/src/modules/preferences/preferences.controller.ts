import { Body, Controller, Get, Put, Req } from '@nestjs/common';
import { Request } from 'express';
import { PreferencesService } from './preferences.service';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';

@Controller('me/preferences')
export class PreferencesController {
  constructor(private readonly service: PreferencesService) {}

  @Get()
  get(@Req() req: Request) {
    return this.service.get((req.user as any).id);
  }

  @Put()
  update(@Req() req: Request, @Body() dto: UpdatePreferencesDto) {
    return this.service.update((req.user as any).id, dto);
  }
}
