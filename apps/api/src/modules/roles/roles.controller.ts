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
import { RequirePermission } from '../auth/require-permission.decorator';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { SetPermissionsDto } from './dto/set-permissions.dto';

@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermission('roles.manage')
  findAll(@Req() req: Request) {
    const schoolId = (req as any).schoolId as string;
    return this.rolesService.findAll(schoolId);
  }

  @Post()
  @RequirePermission('roles.manage')
  create(@Req() req: Request, @Body() dto: CreateRoleDto) {
    const schoolId = (req as any).schoolId as string;
    return this.rolesService.create(dto, schoolId);
  }

  @Get(':id')
  @RequirePermission('roles.manage')
  findOne(@Param('id') id: string) {
    return this.rolesService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission('roles.manage')
  update(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.rolesService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('roles.manage')
  delete(@Param('id') id: string) {
    return this.rolesService.delete(id);
  }

  @Put(':id/permissions')
  @RequirePermission('roles.manage')
  setPermissions(@Param('id') id: string, @Body() dto: SetPermissionsDto) {
    return this.rolesService.setPermissions(id, dto.permissions);
  }
}
