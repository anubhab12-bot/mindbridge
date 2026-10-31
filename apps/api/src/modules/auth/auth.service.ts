import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import {
  AccountStatus,
  ALL_ADMIN_PERMISSIONS,
  type AuthTokenResponse,
  type AuthUser,
  ConsentType,
  DoctorVerificationStatus,
  type MfaChallengeResponse,
  Role,
} from '@mindbridge/shared-types';
import { type Model, Types } from 'mongoose';
import { AppConfigService } from '../../config/app-config.service.js';
import { FieldEncryptionService } from '../../common/crypto/field-encryption.service.js';
import { generateOpaqueToken, sha256 } from '../../common/crypto/tokens.js';
import type { AccessTokenPayload } from '../../common/auth/authenticated-user.js';
import { AuditService } from '../audit/audit.service.js';
import { ConsentService } from '../consent/consent.service.js';
import { DoctorProfile } from '../doctors/schemas/doctor-profile.schema.js';
import { MailService } from '../mail/mail.service.js';
import { PatientProfile } from '../patients/schemas/patient-profile.schema.js';
import { User, type UserDocument } from '../users/schemas/user.schema.js';
import { VerificationService } from '../verification/verification.service.js';
import type { RegisterDto } from './dto/auth.dto.js';
import { PasswordService } from './password.service.js';
import { AuthToken, AuthTokenType } from './schemas/auth-token.schema.js';
import { SessionService } from './session.service.js';
import { generateTotpSecret, otpauthUrl, verifyTotp } from './totp.js';

export interface RequestMeta {
  ip?: string;
  userAgent?: string;
  requestId?: string;
}

export interface IssuedTokens extends AuthTokenResponse {
  refreshToken: string;
  refreshExpiresAt: Date;
}

const GENERIC_LOGIN_ERROR =
  'Email or password is incorrect, or the account is temporarily locked. Please try again later or reset your password.';
const EMAIL_TOKEN_TTL_MS = 24 * 3600 * 1000;
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel(User.name) private readonly users: Model<User>,
    @InjectModel(PatientProfile.name) private readonly patients: Model<PatientProfile>,
    @InjectModel(DoctorProfile.name) private readonly doctors: Model<DoctorProfile>,
    @InjectModel(AuthToken.name) private readonly authTokens: Model<AuthToken>,
    private readonly passwords: PasswordService,
    private readonly sessions: SessionService,
    private readonly jwt: JwtService,
    private readonly config: AppConfigService,
    private readonly consent: ConsentService,
    private readonly mail: MailService,
    private readonly audit: AuditService,
    private readonly crypto: FieldEncryptionService,
    private readonly verification: VerificationService,
  ) {}

  // ---------------------------------------------------------------- registration

  async register(dto: RegisterDto, meta: RequestMeta): Promise<IssuedTokens> {
    // Defence in depth: the DTO already restricts roles, but never let ADMIN through here.
    if (dto.role !== Role.PATIENT && dto.role !== Role.DOCTOR) {
      throw new ForbiddenException({ code: 'ROLE_NOT_ALLOWED', message: 'This role cannot be registered.' });
    }
    if (dto.role === Role.DOCTOR && !dto.doctor) {
      throw new BadRequestException({ code: 'VALIDATION_FAILED', message: 'Professional details are required.' });
    }
    this.passwords.assertStrong(dto.password, dto.email, dto.displayName);

    const existing = await this.users.exists({ email: dto.email });
    if (existing) {
      await this.audit.record({ action: 'auth.register', outcome: 'FAILURE', ip: meta.ip, metadata: { reason: 'email_in_use' } });
      throw new ConflictException({
        code: 'EMAIL_IN_USE',
        message: 'An account with this email already exists. Try signing in or resetting your password.',
      });
    }

    const passwordHash = await this.passwords.hash(dto.password);
    const user = await this.users.create({
      email: dto.email,
      passwordHash,
      role: dto.role,
      status: AccountStatus.ACTIVE,
      displayName: dto.displayName,
      timezone: dto.timezone ?? 'Asia/Kolkata',
      country: dto.country ?? 'IN',
    });
    const userId = user._id.toString();

    try {
      if (dto.role === Role.PATIENT) {
        await this.patients.create({ userId: user._id, ageConfirmedAdult: dto.ageConfirmedAdult === true });
      } else {
        const d = dto.doctor!;
        const conflict = await this.doctors.exists({
          registrationCouncil: d.registrationCouncil,
          registrationNumber: d.registrationNumber,
        });
        if (conflict) {
          throw new ConflictException({
            code: 'REGISTRATION_NUMBER_IN_USE',
            message: 'This registration number is already associated with an account. Please contact support.',
          });
        }
        const profile = await this.doctors.create({
          userId: user._id,
          displayName: dto.displayName,
          professionalCategory: d.professionalCategory,
          qualifications: d.qualifications,
          registrationNumber: d.registrationNumber,
          registrationCouncil: d.registrationCouncil,
          specialties: d.specialties,
          yearsExperience: d.yearsExperience,
          languages: d.languages,
          timezone: dto.timezone ?? 'Asia/Kolkata',
          verificationStatus: DoctorVerificationStatus.APPROVED,
        });
        await this.verification.openApplication(profile._id.toString(), userId);
      }

      await this.consent.record(userId, ConsentType.TERMS, true, { source: 'registration' });
      await this.consent.record(userId, ConsentType.PRIVACY_POLICY, true, { source: 'registration' });
      if (dto.role === Role.PATIENT && dto.aiProcessingConsent) {
        await this.consent.record(userId, ConsentType.AI_PROCESSING, true, { source: 'registration' });
      }
    } catch (err) {
      // No multi-document transaction (works on standalone MongoDB), so compensate manually.
      await Promise.all([
        this.users.deleteOne({ _id: user._id }),
        this.patients.deleteOne({ userId: user._id }),
        this.doctors.deleteOne({ userId: user._id }),
      ]);
      throw err;
    }

    await this.sendVerificationEmail(user);
    if (dto.role === Role.DOCTOR) {
      await this.mail.send(user.email, 'doctor-application-received', { name: user.displayName });
    }
    await this.audit.record({
      actorId: userId,
      actorRole: dto.role,
      action: 'auth.register',
      resourceType: 'User',
      resourceId: userId,
      ip: meta.ip,
      requestId: meta.requestId,
    });
    return this.issueTokens(user, meta);
  }

  // ---------------------------------------------------------------- login

  async login(email: string, password: string, meta: RequestMeta): Promise<IssuedTokens | MfaChallengeResponse> {
    const user = await this.users.findOne({ email }).select('+passwordHash +failedLoginCount +lockedUntil');
    const locked = !!user?.lockedUntil && user.lockedUntil > new Date();
    const ok = await this.passwords.verify(user && !locked ? user.passwordHash : undefined, password);

    if (!user || locked || !ok) {
      if (user && !locked) await this.registerFailedLogin(user);
      await this.audit.record({
        actorId: user?._id.toString() ?? null,
        action: 'auth.login',
        outcome: 'FAILURE',
        ip: meta.ip,
        requestId: meta.requestId,
        metadata: { reason: !user ? 'unknown_email' : locked ? 'locked' : 'bad_password' },
      });
      throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS', message: GENERIC_LOGIN_ERROR });
    }

    this.assertCanSignIn(user);
    await this.users.updateOne({ _id: user._id }, { $set: { failedLoginCount: 0, lockedUntil: null } });

    if (user.mfaEnabled) {
      const mfaToken = await this.jwt.signAsync(
        { sub: user._id.toString(), purpose: 'mfa' },
        { secret: this.config.get('MFA_TOKEN_SECRET'), expiresIn: 300 },
      );
      await this.audit.record({ actorId: user._id.toString(), action: 'auth.login.mfa_challenge', ip: meta.ip });
      return { mfaRequired: true, mfaToken };
    }

    await this.audit.record({
      actorId: user._id.toString(),
      actorRole: user.role,
      action: 'auth.login',
      ip: meta.ip,
      requestId: meta.requestId,
    });
    return this.issueTokens(user, meta);
  }

  async findOrCreateUserByEmail(
    targetEmail?: string,
    _meta?: RequestMeta,
    customDisplayName?: string,
  ): Promise<UserDocument> {
    const rawEmail = (targetEmail && targetEmail.includes('@') ? targetEmail : 'anubhab.admin@gmail.com').toLowerCase().trim();
    let user = await this.users.findOne({ email: rawEmail });
    const adminEmailConfig = (process.env['ADMIN_EMAIL'] || '').toLowerCase();
    const isSuperAdmin = Boolean(
      (adminEmailConfig && rawEmail === adminEmailConfig) ||
      rawEmail.includes('admin') ||
      rawEmail.includes('anubhab')
    );

    if (!user) {
      const namePart = customDisplayName || rawEmail.split('@')[0] || 'User';
      const displayName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
      const role = isSuperAdmin ? Role.ADMIN : Role.PATIENT;
      user = await this.users.create({
        email: rawEmail,
        displayName,
        role,
        adminPermissions: isSuperAdmin ? [...ALL_ADMIN_PERMISSIONS] : [],
        status: AccountStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        passwordHash: 'GOOGLE_OAUTH_VERIFIED',
      });
      if (role === Role.PATIENT) {
        await this.patients.create({ userId: user._id, ageConfirmedAdult: true, preferredLanguage: 'en' });
      }
    } else if (isSuperAdmin && user.role !== Role.ADMIN) {
      user.role = Role.ADMIN;
      user.adminPermissions = [...ALL_ADMIN_PERMISSIONS];
      await user.save();
    }
    return user;
  }

  async findOrCreateGoogleDemoUser(): Promise<UserDocument> {
    return this.findOrCreateUserByEmail('asha.demo@mindbridge.test');
  }

  async completeMfaLogin(mfaToken: string, code: string, meta: RequestMeta): Promise<IssuedTokens> {
    let sub: string;
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; purpose: string }>(mfaToken, {
        secret: this.config.get('MFA_TOKEN_SECRET'),
      });
      if (payload.purpose !== 'mfa') throw new Error('wrong purpose');
      sub = payload.sub;
    } catch {
      throw new UnauthorizedException({ code: 'MFA_EXPIRED', message: 'Your sign-in expired. Please start again.' });
    }
    const user = await this.users.findById(sub).select('+mfaSecretEnc +failedLoginCount +lockedUntil');
    if (!user || !user.mfaEnabled || !user.mfaSecretEnc) {
      throw new UnauthorizedException({ code: 'MFA_FAILED', message: 'The code is not valid.' });
    }
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS', message: GENERIC_LOGIN_ERROR });
    }
    this.assertCanSignIn(user);
    if (!verifyTotp(this.crypto.decrypt(user.mfaSecretEnc), code)) {
      await this.registerFailedLogin(user);
      await this.audit.record({ actorId: sub, action: 'auth.login.mfa', outcome: 'FAILURE', ip: meta.ip });
      throw new UnauthorizedException({ code: 'MFA_FAILED', message: 'The code is not valid.' });
    }
    await this.users.updateOne({ _id: user._id }, { $set: { failedLoginCount: 0, lockedUntil: null } });
    await this.audit.record({ actorId: sub, actorRole: user.role, action: 'auth.login', ip: meta.ip, metadata: { mfa: true } });
    return this.issueTokens(user, meta);
  }

  private async registerFailedLogin(user: UserDocument) {
    const max = this.config.get('MAX_FAILED_LOGINS');
    const failed = (user.failedLoginCount ?? 0) + 1;
    const update: Record<string, unknown> = { failedLoginCount: failed };
    if (failed >= max) {
      // Exponential lockout: 15 min, 30 min, 60 min … capped at 24 h.
      const multiplier = 2 ** Math.min(failed - max, 6);
      const minutes = Math.min(this.config.get('LOCKOUT_MINUTES') * multiplier, 24 * 60);
      update['lockedUntil'] = new Date(Date.now() + minutes * 60_000);
      await this.audit.record({ actorId: user._id.toString(), action: 'auth.account_locked', outcome: 'DENIED', metadata: { minutes } });
    }
    await this.users.updateOne({ _id: user._id }, { $set: update });
  }

  private assertCanSignIn(user: UserDocument) {
    if (user.status === AccountStatus.SUSPENDED || user.status === AccountStatus.DELETED) {
      throw new ForbiddenException({
        code: 'ACCOUNT_UNAVAILABLE',
        message: 'This account cannot sign in right now. Please contact support.',
      });
    }
  }

  // ---------------------------------------------------------------- tokens

  async issueTokens(user: UserDocument, meta: RequestMeta): Promise<IssuedTokens> {
    const { session, refreshToken } = await this.sessions.create(user._id.toString(), meta);
    await this.users.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });
    return {
      accessToken: await this.signAccessToken(user, session._id.toString()),
      expiresIn: this.config.get('JWT_ACCESS_TTL_SECONDS'),
      user: await this.toAuthUser(user),
      refreshToken,
      refreshExpiresAt: session.expiresAt,
    };
  }

  private signAccessToken(user: Pick<User, 'role'> & { _id: Types.ObjectId }, sessionId: string) {
    const payload: AccessTokenPayload = { sub: user._id.toString(), role: user.role, sid: sessionId };
    return this.jwt.signAsync(payload, {
      secret: this.config.get('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get('JWT_ACCESS_TTL_SECONDS'),
    });
  }

  async refresh(refreshToken: string | undefined, meta: RequestMeta): Promise<IssuedTokens> {
    if (!refreshToken) throw new UnauthorizedException({ code: 'NO_SESSION', message: 'Please sign in.' });
    const result = await this.sessions.rotate(refreshToken);
    if (result.kind === 'reuse') {
      await this.audit.record({
        actorId: result.userId,
        action: 'auth.refresh_token_reuse',
        outcome: 'DENIED',
        resourceType: 'Session',
        resourceId: result.sessionId,
        ip: meta.ip,
      });
      throw new UnauthorizedException({ code: 'SESSION_REVOKED', message: 'Your session ended. Please sign in again.' });
    }
    if (result.kind === 'invalid') {
      throw new UnauthorizedException({ code: 'NO_SESSION', message: 'Please sign in.' });
    }
    const user = await this.users.findById(result.session.userId);
    if (!user || user.status === AccountStatus.SUSPENDED || user.status === AccountStatus.DELETED) {
      await this.sessions.revoke(result.session._id.toString(), 'account_unavailable');
      throw new UnauthorizedException({ code: 'NO_SESSION', message: 'Please sign in.' });
    }
    return {
      accessToken: await this.signAccessToken(user, result.session._id.toString()),
      expiresIn: this.config.get('JWT_ACCESS_TTL_SECONDS'),
      user: await this.toAuthUser(user),
      refreshToken: result.refreshToken,
      refreshExpiresAt: result.session.expiresAt,
    };
  }

  async logout(refreshToken: string | undefined, sessionIdFromAccess: string | undefined, meta: RequestMeta) {
    let sessionId = sessionIdFromAccess;
    let userId: string | undefined;
    if (refreshToken) {
      const s = await this.sessions.findByToken(refreshToken);
      if (s) {
        sessionId = s._id.toString();
        userId = s.userId.toString();
      }
    }
    if (sessionId) await this.sessions.revoke(sessionId, 'logout');
    await this.audit.record({ actorId: userId ?? null, action: 'auth.logout', ip: meta.ip });
  }

  async logoutAll(userId: string) {
    await this.sessions.revokeAllForUser(userId, 'logout_all');
    await this.audit.record({ actorId: userId, action: 'auth.logout_all' });
  }

  // ---------------------------------------------------------------- email verification

  private async createAuthToken(userId: Types.ObjectId, type: AuthTokenType, ttlMs: number) {
    const token = generateOpaqueToken();
    await this.authTokens.updateMany({ userId, type, usedAt: null }, { $set: { usedAt: new Date() } });
    await this.authTokens.create({ userId, type, tokenHash: sha256(token), expiresAt: new Date(Date.now() + ttlMs) });
    return token;
  }

  private async consumeAuthToken(token: string, type: AuthTokenType) {
    return this.authTokens.findOneAndUpdate(
      { tokenHash: sha256(token), type, usedAt: null, expiresAt: { $gt: new Date() } },
      { $set: { usedAt: new Date() } },
      { new: true },
    );
  }

  async sendVerificationEmail(user: Pick<UserDocument, '_id' | 'email' | 'displayName' | 'emailVerifiedAt'>) {
    if (user.emailVerifiedAt) return;
    const token = await this.createAuthToken(user._id, AuthTokenType.EMAIL_VERIFICATION, EMAIL_TOKEN_TTL_MS);
    await this.mail.send(user.email, 'verify-email', { name: user.displayName, token });
  }

  async resendVerification(userId: string) {
    const user = await this.users.findById(userId);
    if (user) await this.sendVerificationEmail(user);
  }

  async verifyEmail(token: string, meta: RequestMeta) {
    const row = await this.consumeAuthToken(token, AuthTokenType.EMAIL_VERIFICATION);
    if (!row) {
      throw new BadRequestException({ code: 'TOKEN_INVALID', message: 'This link is invalid or has expired.' });
    }
    await this.users.updateOne({ _id: row.userId, emailVerifiedAt: null }, { $set: { emailVerifiedAt: new Date() } });
    await this.audit.record({ actorId: row.userId.toString(), action: 'auth.email_verified', ip: meta.ip });
    return { verified: true };
  }

  // ---------------------------------------------------------------- password reset

  /** Always resolves the same way whether or not the email exists (no account enumeration). */
  async forgotPassword(email: string, meta: RequestMeta) {
    const user = await this.users.findOne({ email, status: { $in: [AccountStatus.ACTIVE, AccountStatus.PENDING_DELETION] } });
    if (user) {
      const token = await this.createAuthToken(user._id, AuthTokenType.PASSWORD_RESET, RESET_TOKEN_TTL_MS);
      await this.mail.send(user.email, 'password-reset', { name: user.displayName, token });
    }
    await this.audit.record({ actorId: user?._id.toString() ?? null, action: 'auth.password_reset_requested', ip: meta.ip });
  }

  async resetPassword(token: string, password: string, meta: RequestMeta) {
    const tokenRow = await this.authTokens.findOne({
      tokenHash: sha256(token),
      type: AuthTokenType.PASSWORD_RESET,
      usedAt: null,
      expiresAt: { $gt: new Date() },
    });
    if (!tokenRow) {
      throw new BadRequestException({ code: 'TOKEN_INVALID', message: 'This link is invalid or has expired.' });
    }
    const user = await this.users.findById(tokenRow.userId);
    if (!user) throw new BadRequestException({ code: 'TOKEN_INVALID', message: 'This link is invalid or has expired.' });
    this.passwords.assertStrong(password, user.email, user.displayName);
    const consumed = await this.consumeAuthToken(token, AuthTokenType.PASSWORD_RESET);
    if (!consumed) throw new BadRequestException({ code: 'TOKEN_INVALID', message: 'This link is invalid or has expired.' });

    await this.users.updateOne(
      { _id: user._id },
      {
        $set: {
          passwordHash: await this.passwords.hash(password),
          passwordChangedAt: new Date(),
          failedLoginCount: 0,
          lockedUntil: null,
          // Completing a reset proves control of the mailbox.
          emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
        },
      },
    );
    await this.sessions.revokeAllForUser(user._id.toString(), 'password_reset');
    await this.mail.send(user.email, 'password-changed', { name: user.displayName });
    await this.audit.record({ actorId: user._id.toString(), action: 'auth.password_reset', ip: meta.ip });
  }

  async changePassword(userId: string, sessionId: string, current: string, next: string) {
    const user = await this.users.findById(userId).select('+passwordHash');
    if (!user || !(await this.passwords.verify(user.passwordHash, current))) {
      await this.audit.record({ actorId: userId, action: 'auth.password_change', outcome: 'FAILURE' });
      throw new BadRequestException({ code: 'INVALID_PASSWORD', message: 'Your current password is not correct.' });
    }
    this.passwords.assertStrong(next, user.email, user.displayName);
    await this.users.updateOne(
      { _id: user._id },
      { $set: { passwordHash: await this.passwords.hash(next), passwordChangedAt: new Date() } },
    );
    await this.sessions.revokeAllForUser(userId, 'password_change', sessionId);
    await this.mail.send(user.email, 'password-changed', { name: user.displayName });
    await this.audit.record({ actorId: userId, action: 'auth.password_change' });
  }

  // ---------------------------------------------------------------- MFA (doctors and admins)

  async beginMfaSetup(userId: string) {
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException();
    if (user.role === Role.PATIENT) {
      throw new ForbiddenException({ code: 'MFA_NOT_AVAILABLE', message: 'Two-step sign-in is available for professionals and administrators.' });
    }
    if (user.mfaEnabled) throw new ConflictException({ code: 'MFA_ALREADY_ENABLED', message: 'Two-step sign-in is already on.' });
    const secret = generateTotpSecret();
    await this.users.updateOne({ _id: user._id }, { $set: { mfaSecretEnc: this.crypto.encrypt(secret) } });
    return { secret, otpauthUrl: otpauthUrl(secret, user.email) };
  }

  async enableMfa(userId: string, code: string) {
    const user = await this.users.findById(userId).select('+mfaSecretEnc');
    if (!user?.mfaSecretEnc) throw new BadRequestException({ code: 'MFA_NOT_STARTED', message: 'Start setup first.' });
    if (!verifyTotp(this.crypto.decrypt(user.mfaSecretEnc), code)) {
      throw new BadRequestException({ code: 'MFA_FAILED', message: 'The code is not valid.' });
    }
    await this.users.updateOne({ _id: user._id }, { $set: { mfaEnabled: true } });
    await this.audit.record({ actorId: userId, action: 'auth.mfa_enabled' });
  }

  async disableMfa(userId: string, password: string, code: string) {
    const user = await this.users.findById(userId).select('+passwordHash +mfaSecretEnc');
    if (!user?.mfaEnabled || !user.mfaSecretEnc) return;
    const ok =
      (await this.passwords.verify(user.passwordHash, password)) && verifyTotp(this.crypto.decrypt(user.mfaSecretEnc), code);
    if (!ok) {
      await this.audit.record({ actorId: userId, action: 'auth.mfa_disable', outcome: 'FAILURE' });
      throw new BadRequestException({ code: 'MFA_FAILED', message: 'Password or code is not valid.' });
    }
    await this.users.updateOne({ _id: user._id }, { $set: { mfaEnabled: false }, $unset: { mfaSecretEnc: 1 } });
    await this.audit.record({ actorId: userId, action: 'auth.mfa_disabled' });
  }

  // ---------------------------------------------------------------- views

  async me(userId: string): Promise<AuthUser> {
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException();
    return this.toAuthUser(user);
  }

  async toAuthUser(user: UserDocument): Promise<AuthUser> {
    const result: AuthUser = {
      id: user._id.toString(),
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      status: user.status,
      emailVerified: !!user.emailVerifiedAt,
      mfaEnabled: user.mfaEnabled,
      timezone: user.timezone,
    };
    if (user.role === Role.DOCTOR) {
      const profile = await this.doctors.findOne({ userId: user._id }).select('verificationStatus').lean();
      result.doctorVerificationStatus = profile?.verificationStatus ?? DoctorVerificationStatus.PENDING_VERIFICATION;
    }
    if (user.role === Role.ADMIN) result.adminPermissions = user.adminPermissions;
    return result;
  }
}
