import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import mongoose from 'mongoose';

interface ErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}

const STATUS_CODES: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  413: 'PAYLOAD_TOO_LARGE',
  415: 'UNSUPPORTED_MEDIA_TYPE',
  422: 'UNPROCESSABLE_ENTITY',
  423: 'LOCKED',
  429: 'TOO_MANY_REQUESTS',
  503: 'SERVICE_UNAVAILABLE',
};

/**
 * Converts every thrown error into `{ error: { code, message, details? }, requestId }`.
 * Unexpected errors are logged server-side with the request id and returned as a generic
 * 500 so stack traces and internal details never reach the client.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    if (host.getType() !== 'http') throw exception;
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request & { id?: string }>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let payload: ErrorPayload = { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' };

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        payload = { code: STATUS_CODES[status] ?? 'ERROR', message: body };
      } else {
        const b = body as Record<string, unknown>;
        const rawMessage = b['message'];
        const isValidation = Array.isArray(rawMessage);
        payload = {
          code: (b['code'] as string) ?? (isValidation ? 'VALIDATION_FAILED' : (STATUS_CODES[status] ?? 'ERROR')),
          message: isValidation ? 'Some fields need attention.' : String(rawMessage ?? exception.message),
          details: isValidation ? rawMessage : b['details'],
        };
      }
    } else if (exception instanceof mongoose.Error.ValidationError) {
      status = HttpStatus.BAD_REQUEST;
      payload = { code: 'VALIDATION_FAILED', message: 'Some fields need attention.' };
    } else if (exception instanceof mongoose.Error.CastError) {
      status = HttpStatus.BAD_REQUEST;
      payload = { code: 'INVALID_ID', message: 'Invalid identifier.' };
    } else if (isDuplicateKeyError(exception)) {
      status = HttpStatus.CONFLICT;
      payload = { code: 'CONFLICT', message: 'This conflicts with an existing record.' };
    }

    if (status >= 500) {
      const err = exception instanceof Error ? exception : new Error(String(exception));
      this.logger.error(
        { requestId: req.id, method: req.method, path: req.route?.path ?? 'unknown', error: err.message },
        err.stack,
      );
    }

    res.status(status).json({ error: payload, requestId: req.id });
  }
}

function isDuplicateKeyError(e: unknown): boolean {
  return typeof e === 'object' && e !== null && (e as { code?: number }).code === 11000;
}
