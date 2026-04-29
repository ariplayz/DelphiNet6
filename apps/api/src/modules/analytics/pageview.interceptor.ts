import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request } from 'express';
import { TypedEventEmitter } from '../event-bus/typed-event-emitter.service';

@Injectable()
export class PageviewInterceptor implements NestInterceptor {
  constructor(private readonly events: TypedEventEmitter) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();

    if (req.method !== 'GET') {
      return next.handle();
    }

    return next.handle().pipe(
      tap(() => {
        const user = (req as any).user as { id: string } | undefined;
        if (!user) return;

        const schoolId = (req as any).schoolId as string | undefined;
        if (!schoolId) return;

        this.events.emit('pageview.recorded', {
          userId: user.id,
          schoolId,
          from: req.headers.referer ?? '',
          to: req.url,
          ts: Date.now(),
        });
      }),
    );
  }
}
