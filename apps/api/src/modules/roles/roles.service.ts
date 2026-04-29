import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(schoolId: string) {
    return this.prisma.role.findMany({
      where: { OR: [{ schoolId }, { schoolId: null }] },
      include: { rolePermissions: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: { rolePermissions: true },
    });
    if (!role) throw new NotFoundException(`Role ${id} not found`);
    return role;
  }

  create(dto: CreateRoleDto, schoolId: string) {
    return this.prisma.role.create({
      data: { ...dto, schoolId },
      include: { rolePermissions: true },
    });
  }

  async update(id: string, dto: UpdateRoleDto) {
    await this.findOne(id);
    return this.prisma.role.update({
      where: { id },
      data: dto,
      include: { rolePermissions: true },
    });
  }

  async delete(id: string) {
    const role = await this.findOne(id);
    if (role.isBuiltIn) {
      throw new BadRequestException('Cannot delete a built-in role');
    }
    await this.prisma.role.delete({ where: { id } });
    return { deleted: true };
  }

  async setPermissions(roleId: string, permissions: string[]) {
    await this.findOne(roleId);

    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({ where: { roleId } }),
      this.prisma.rolePermission.createMany({
        data: permissions.map((permission) => ({ roleId, permission })),
        skipDuplicates: true,
      }),
    ]);

    return this.findOne(roleId);
  }
}
