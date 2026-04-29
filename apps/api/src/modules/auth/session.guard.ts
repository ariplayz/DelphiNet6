import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { PrismaService } from '../database/prisma.service';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const token: string | undefined = req.cookies?.['sesh'];

    if (!token) throw new UnauthorizedException('No session token');

    const session = await this.prisma.session.findUnique({
      where: { token },
      include: {
        user: {
          include: {
            userRoles: {
              include: {
                role: {
                  include: { rolePermissions: true },
                },
              },
            },
          },
        },
      },
    });

    if (!session) throw new UnauthorizedException('Invalid session');
    if (session.expiresAt < new Date()) {
      await this.prisma.session.delete({ where: { id: session.id } });
      throw new UnauthorizedException('Session expired');
    }

    const permissions = session.user.userRoles.flatMap(
      (ur: { role: { rolePermissions: { permission: string }[] } }) =>
        ur.role.rolePermissions.map((rp) => rp.permission),
    );

    // deduplicate
    req.user = {
      ...session.user,
      permissions: [...new Set(permissions)],
    };

    return true;
  }
}
