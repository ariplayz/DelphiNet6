import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { PERMISSIONS_KEY } from './require-permission.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const userPerms: string[] = req.user?.permissions ?? [];

    // super_admin.all bypasses all permission checks
    if (userPerms.includes('super_admin.all')) return true;

    const hasAll = required.every((p) => userPerms.includes(p));
    if (!hasAll) throw new ForbiddenException('Insufficient permissions');

    return true;
  }
}
