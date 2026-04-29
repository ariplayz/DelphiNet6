import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

/**
 * Global error filter — turns thrown exceptions into a consistent JSON
 * envelope and, crucially, logs the underlying error so we can diagnose
 * Internal Server Errors after the fact.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let code: string | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const r = exception.getResponse();
      message = typeof r === 'string' ? r : (r as { message?: string | string[] })?.message ?? exception.message;
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      code = exception.code;
      if (code === 'P2002') {
        status = HttpStatus.CONFLICT;
        message = 'A record with these unique values already exists';
      } else if (code === 'P2025') {
        status = HttpStatus.NOT_FOUND;
        message = 'Record not found';
      } else if (code === 'P2003') {
        status = HttpStatus.BAD_REQUEST;
        message = 'Foreign key constraint failed';
      } else {
        status = HttpStatus.BAD_REQUEST;
        message = exception.message;
      }
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      message = 'Invalid request payload';
    }

    if (status >= 500) {
      this.logger.error(
        `${req.method} ${req.originalUrl} → ${status}: ${exception instanceof Error ? exception.stack : exception}`,
      );
    } else {
      this.logger.warn(`${req.method} ${req.originalUrl} → ${status}: ${Array.isArray(message) ? message.join('; ') : message}`);
    }

    res.status(status).json({
      statusCode: status,
      message,
      ...(code ? { code } : {}),
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
    });
  }
}
