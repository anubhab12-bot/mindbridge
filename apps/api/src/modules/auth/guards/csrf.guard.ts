import { type CanActivate, type ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { AppConfigService } from '../../../config/app-config.service.js';

export const CSRF_HEADER = 'x-mindbridge-csrf';

/**
 * Protects the cookie-authenticated endpoints (refresh, logout). Besides the SameSite=Strict
 * cookie, the request must carry a custom header (which browsers only send cross-origin after
 * a CORS preflight that our allowlist rejects) and, when present, an allowed Origin.
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly config: AppConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    if (req.headers[CSRF_HEADER] !== '1') {
      throw new ForbiddenException({ code: 'CSRF_REJECTED', message: 'Request blocked.' });
    }
    const origin = req.headers.origin;
    if (origin && !this.config.corsOrigins.includes(origin)) {
      throw new ForbiddenException({ code: 'CSRF_REJECTED', message: 'Request blocked.' });
    }
    return true;
  }
}
