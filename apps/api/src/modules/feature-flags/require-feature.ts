import { applyDecorators, type CanActivate, type ExecutionContext, Injectable, ServiceUnavailableException, SetMetadata, UseGuards } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeatureFlagsService } from './feature-flags.service.js';

const FEATURE_KEY = 'requiredFeature';

@Injectable()
export class FeatureFlagGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly flags: FeatureFlagsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const key = this.reflector.getAllAndOverride<string | undefined>(FEATURE_KEY, [context.getHandler(), context.getClass()]);
    if (!key || (await this.flags.isEnabled(key))) return true;
    throw new ServiceUnavailableException({ code: 'FEATURE_DISABLED', message: 'This feature is temporarily unavailable.' });
  }
}

/**
 * Lets admins pause a feature. Never apply this to crisis resources or safety endpoints:
 * those must stay available whatever the flag state.
 */
export const RequireFeature = (key: string) => applyDecorators(SetMetadata(FEATURE_KEY, key), UseGuards(FeatureFlagGuard));
