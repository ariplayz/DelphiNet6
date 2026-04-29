import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../database/prisma.service';
import { TypedEventEmitter } from '../event-bus/typed-event-emitter.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: TypedEventEmitter,
  ) {}

  findAll(schoolId: string, search?: string, form?: number) {
    return this.prisma.user.findMany({
      where: {
        schoolId,
        ...(search
          ? {
              OR: [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
        ...(form !== undefined ? { form } : {}),
      },
      include: {
        userRoles: { include: { role: true } },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { userRoles: { include: { role: true } } },
    });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async create(dto: CreateUserDto, schoolId: string, actorId: string) {
    const passwordHash = await argon2.hash(dto.password);
    const { password: _pw, ...rest } = dto;

    const user = await this.prisma.user.create({
      data: { ...rest, passwordHash, schoolId },
    });

    this.events.emit('user.created', {
      userId: user.id,
      schoolId,
      createdBy: actorId,
    });
    this.events.emit('audit.log', {
      userId: actorId,
      schoolId,
      action: 'user.created',
      entity: 'User',
      entityId: user.id,
    });

    const { passwordHash: _ph, ...safeUser } = user;
    return safeUser;
  }

  async update(id: string, dto: UpdateUserDto, schoolId: string, actorId: string) {
    await this.findOne(id);

    const data: Record<string, unknown> = { ...dto };
    if (dto.password) {
      data['passwordHash'] = await argon2.hash(dto.password);
      delete data['password'];
    }

    const user = await this.prisma.user.update({ where: { id }, data });

    this.events.emit('user.updated', { userId: id, schoolId, updatedBy: actorId });
    this.events.emit('audit.log', {
      userId: actorId,
      schoolId,
      action: 'user.updated',
      entity: 'User',
      entityId: id,
    });

    const { passwordHash: _ph, ...safeUser } = user;
    return safeUser;
  }

  async delete(id: string, schoolId: string, actorId: string) {
    await this.findOne(id);
    await this.prisma.user.delete({ where: { id } });

    this.events.emit('audit.log', {
      userId: actorId,
      schoolId,
      action: 'user.deleted',
      entity: 'User',
      entityId: id,
    });

    return { deleted: true };
  }

  async assignRole(userId: string, roleId: string, schoolId: string, actorId: string) {
    const user = await this.findOne(userId);

    const alreadyAssigned = user.userRoles.some((ur: { roleId: string }) => ur.roleId === roleId);
    if (alreadyAssigned) throw new BadRequestException('Role already assigned');

    await this.prisma.userRole.create({
      data: { userId, roleId, grantedBy: actorId },
    });

    this.events.emit('user.role_assigned', { userId, roleId, assignedBy: actorId });
    this.events.emit('audit.log', {
      userId: actorId,
      schoolId,
      action: 'user.role_assigned',
      entity: 'UserRole',
      entityId: `${userId}:${roleId}`,
    });

    return this.findOne(userId);
  }

  async removeRole(userId: string, roleId: string, schoolId: string, actorId: string) {
    await this.findOne(userId);

    await this.prisma.userRole.delete({ where: { userId_roleId: { userId, roleId } } });

    this.events.emit('user.role_removed', { userId, roleId, removedBy: actorId });
    this.events.emit('audit.log', {
      userId: actorId,
      schoolId,
      action: 'user.role_removed',
      entity: 'UserRole',
      entityId: `${userId}:${roleId}`,
    });

    return this.findOne(userId);
  }

  async getUserPermissions(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: { role: { include: { rolePermissions: true } } },
        },
      },
    });
    if (!user) throw new NotFoundException(`User ${userId} not found`);

    const perms = user.userRoles.flatMap(
      (ur: { role: { rolePermissions: { permission: string }[] } }) =>
        ur.role.rolePermissions.map((rp: { permission: string }) => rp.permission),
    );
    return [...new Set(perms)];
  }
}
