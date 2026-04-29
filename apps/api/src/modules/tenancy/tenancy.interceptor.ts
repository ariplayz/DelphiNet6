import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request } from 'express';
import { Reflector } from '@nestjs/core';
import { SchoolContextStorage } from './school-context.storage';
import { IS_PUBLIC_KEY } from '../auth/public.decorator';

@Injectable()
export class TenancyInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return next.handle();

    const req = context.switchToHttp().getRequest<Request>();
    const user = req.user;

    if (!user) return next.handle();

    let schoolId: string | undefined;

    if (user.isSuperAdmin) {
      // Super-admin can target a school via header or falls back to their own schoolId
      const headerSchool = req.headers['x-school-id'];
      schoolId =
        (Array.isArray(headerSchool) ? headerSchool[0] : headerSchool) ??
        user.schoolId;
    } else {
      schoolId = user.schoolId;
    }

    if (!schoolId) return next.handle();

    req.schoolId = schoolId;

    return new Observable((subscriber) => {
      SchoolContextStorage.run({ schoolId: schoolId! }, () => {
        next
          .handle()
          .subscribe({
            next: (val) => subscriber.next(val),
            error: (err) => subscriber.error(err),
            complete: () => subscriber.complete(),
          });
      });
    });
  }
}
