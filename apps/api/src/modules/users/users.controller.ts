import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { RequirePermission } from '../auth/require-permission.decorator';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignRoleDto } from './dto/assign-role.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermission('users.view')
  findAll(
    @Req() req: Request,
    @Query('search') search?: string,
    @Query('form') form?: string,
  ) {
    const schoolId = (req as any).schoolId as string;
    return this.usersService.findAll(schoolId, search, form ? parseInt(form, 10) : undefined);
  }

  @Post()
  @RequirePermission('users.manage')
  create(@Req() req: Request, @Body() dto: CreateUserDto) {
    const schoolId = (req as any).schoolId as string;
    const actorId = req.user!.id;
    return this.usersService.create(dto, schoolId, actorId);
  }

  @Get(':id')
  @RequirePermission('users.view')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission('users.manage')
  update(@Req() req: Request, @Param('id') id: string, @Body() dto: UpdateUserDto) {
    const schoolId = (req as any).schoolId as string;
    return this.usersService.update(id, dto, schoolId, req.user!.id);
  }

  @Delete(':id')
  @RequirePermission('users.manage')
  delete(@Req() req: Request, @Param('id') id: string) {
    const schoolId = (req as any).schoolId as string;
    return this.usersService.delete(id, schoolId, req.user!.id);
  }

  @Get(':id/roles')
  @RequirePermission('users.view')
  getRoles(@Param('id') id: string) {
    return this.usersService.findOne(id).then((u) => u.userRoles);
  }

  @Post(':id/roles')
  @RequirePermission('users.manage')
  assignRole(
    @Req() req: Request,
    @Param('id') userId: string,
    @Body() dto: AssignRoleDto,
  ) {
    const schoolId = (req as any).schoolId as string;
    return this.usersService.assignRole(userId, dto.roleId, schoolId, req.user!.id);
  }

  @Delete(':id/roles/:roleId')
  @RequirePermission('users.manage')
  removeRole(
    @Req() req: Request,
    @Param('id') userId: string,
    @Param('roleId') roleId: string,
  ) {
    const schoolId = (req as any).schoolId as string;
    return this.usersService.removeRole(userId, roleId, schoolId, req.user!.id);
  }
}
