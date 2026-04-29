import {
  Logger,
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
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: TypedEventEmitter,
  ) {}

  /** Emit an event without ever propagating listener exceptions back into the caller. */
  private safeEmit<T extends Parameters<TypedEventEmitter['emit']>[0]>(
    name: T,
    payload: Parameters<TypedEventEmitter['emit']>[1],
  ) {
    try {
      this.safeEmit(name as never, payload as never);
    } catch (err) {
      this.logger.warn(`Event emit '${String(name)}' failed: ${err instanceof Error ? err.message : err}`);
    }
  }

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

    this.safeEmit('user.created', {
      userId: user.id,
      schoolId,
      createdBy: actorId,
    });
    this.safeEmit('audit.log', {
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

    this.safeEmit('user.updated', { userId: id, schoolId, updatedBy: actorId });
    this.safeEmit('audit.log', {
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

    this.safeEmit('audit.log', {
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

    this.safeEmit('user.role_assigned', { userId, roleId, assignedBy: actorId });
    this.safeEmit('audit.log', {
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

    this.safeEmit('user.role_removed', { userId, roleId, removedBy: actorId });
    this.safeEmit('audit.log', {
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
