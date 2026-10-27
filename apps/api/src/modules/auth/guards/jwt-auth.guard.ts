import { type CanActivate, type ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { AccountStatus, Role } from '@mindbridge/shared-types';
import type { Request } from 'express';
import type { Model } from 'mongoose';
import { AppConfigService } from '../../../config/app-config.service.js';
import type { AccessTokenPayload, AuthenticatedUser } from '../../../common/auth/authenticated-user.js';
import { IS_PUBLIC_KEY } from '../../../common/auth/decorators.js';
import { DoctorProfile } from '../../doctors/schemas/doctor-profile.schema.js';
import { User } from '../../users/schemas/user.schema.js';
import { SessionService } from '../session.service.js';

export function extractBearer(header: string | undefined): string | undefined {
  if (!header) return undefined;
  const [scheme, token] = header.split(' ');
  return scheme?.toLowerCase() === 'bearer' && token ? token : undefined;
}

/**
 * Global guard. Verifies the access token and then re-reads the user, the session and
 * (for doctors) the verification status from the database on every request, so logout,
 * suspension and verification changes take effect immediately rather than at token expiry.
 * Role/ownership values in the request body or query are never trusted.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly config: AppConfigService,
    private readonly sessions: SessionService,
    @InjectModel(User.name) private readonly users: Model<User>,
    @InjectModel(DoctorProfile.name) private readonly doctors: Model<DoctorProfile>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()]);
    const req = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const token = extractBearer(req.headers.authorization);

    if (!token) {
      if (isPublic) return true;
      throw new UnauthorizedException({ code: 'UNAUTHENTICATED', message: 'Please sign in.' });
    }

    const user = await this.resolve(token);
    if (!user) {
      if (isPublic) return true;
      throw new UnauthorizedException({ code: 'UNAUTHENTICATED', message: 'Your session has ended. Please sign in again.' });
    }
    req.user = user;
    return true;
  }

  async resolve(token: string): Promise<AuthenticatedUser | null> {
    let payload: AccessTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<AccessTokenPayload>(token, {
        secret: this.config.get('JWT_ACCESS_SECRET'),
        algorithms: ['HS256'],
      });
    } catch {
      return null;
    }
    const [session, user] = await Promise.all([
      this.sessions.findActiveById(payload.sid),
      this.users.findById(payload.sub).select('role status emailVerifiedAt adminPermissions').lean(),
    ]);
    if (!session || !user || session.userId.toString() !== payload.sub) return null;
    if (user.status === AccountStatus.SUSPENDED || user.status === AccountStatus.DELETED) return null;
    // The role in the token must still match the stored role.
    if (user.role !== payload.role) return null;

    const result: AuthenticatedUser = {
      id: payload.sub,
      role: user.role,
      sessionId: payload.sid,
      status: user.status,
      emailVerified: !!user.emailVerifiedAt,
      adminPermissions: user.role === Role.ADMIN ? (user.adminPermissions ?? []) : [],
    };
    if (user.role === Role.DOCTOR) {
      const profile = await this.doctors.findOne({ userId: user._id }).select('_id verificationStatus').lean();
      result.doctorStatus = profile?.verificationStatus;
      result.doctorProfileId = profile?._id.toString();
    }
    return result;
  }
}
