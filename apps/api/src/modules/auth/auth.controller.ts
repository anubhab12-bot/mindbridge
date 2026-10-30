import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Req,
  Res,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Role } from '@mindbridge/shared-types';
import type { Request, Response } from 'express';
import { AppConfigService } from '../../config/app-config.service.js';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user.js';
import { CurrentUser, Public, Roles } from '../../common/auth/decorators.js';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe.js';
import { AuthService, type IssuedTokens, type RequestMeta } from './auth.service.js';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  MfaCodeDto,
  MfaDisableDto,
  MfaVerifyDto,
  RegisterDto,
  ResetPasswordDto,
  TokenDto,
} from './dto/auth.dto.js';
import { CsrfGuard } from './guards/csrf.guard.js';
import { SessionService } from './session.service.js';
import { FeatureFlagsService } from '../feature-flags/feature-flags.service.js';

export const REFRESH_COOKIE = 'mb_rt';
const REFRESH_COOKIE_PATH = '/api/v1/auth';

/** Stricter rate limit for credential endpoints (per client IP). */
const AUTH_LIMIT = { default: { limit: () => Number(process.env['AUTH_THROTTLE_LIMIT'] ?? 10), ttl: 60_000 } };

const ALL_ROLES = [Role.PATIENT, Role.DOCTOR, Role.ADMIN];

export function requestMeta(req: Request & { id?: string }): RequestMeta {
  return { ip: req.ip, userAgent: req.headers['user-agent'], requestId: req.id };
}

@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly sessions: SessionService,
    private readonly config: AppConfigService,
    private readonly flags: FeatureFlagsService,
  ) {}

  private setRefreshCookie(res: Response, tokens: IssuedTokens) {
    res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
      httpOnly: true,
      secure: this.config.get('COOKIE_SECURE'),
      sameSite: 'strict',
      path: REFRESH_COOKIE_PATH,
      expires: tokens.refreshExpiresAt,
    });
  }

  private clearRefreshCookie(res: Response) {
    res.clearCookie(REFRESH_COOKIE, {
      httpOnly: true,
      secure: this.config.get('COOKIE_SECURE'),
      sameSite: 'strict',
      path: REFRESH_COOKIE_PATH,
    });
  }

  /** The refresh token is only ever sent as an HttpOnly cookie, never in the JSON body. */
  private respond(res: Response, tokens: IssuedTokens) {
    this.setRefreshCookie(res, tokens);
    return { accessToken: tokens.accessToken, expiresIn: tokens.expiresIn, user: tokens.user };
  }

  @Public()
  @Throttle(AUTH_LIMIT)
  @Post('register')
  @ApiOperation({ summary: 'Register as a patient or doctor (public). Admin accounts cannot be registered here.' })
  async register(@Body() dto: RegisterDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    if (dto.role === Role.DOCTOR && !(await this.flags.isEnabled('registration.doctor'))) {
      throw new ServiceUnavailableException({ code: 'FEATURE_DISABLED', message: 'Professional sign-up is temporarily paused.' });
    }
    return this.respond(res, await this.auth.register(dto, requestMeta(req)));
  }

  @Public()
  @Throttle(AUTH_LIMIT)
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Sign in (public). Returns an MFA challenge for accounts with two-step sign-in.' })
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.login(dto.email, dto.password, requestMeta(req));
    if ('mfaRequired' in result) return result;
    return this.respond(res, result);
  }

  @Public()
  @Throttle(AUTH_LIMIT)
  @Post('mfa/verify')
  @HttpCode(200)
  @ApiOperation({ summary: 'Complete an MFA sign-in challenge (public, needs mfaToken).' })
  async verifyMfa(@Body() dto: MfaVerifyDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.respond(res, await this.auth.completeMfaLogin(dto.mfaToken, dto.code, requestMeta(req)));
  }

  @Public()
  @UseGuards(CsrfGuard)
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Rotate the refresh cookie and get a new access token (cookie + CSRF header).' })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    try {
      return this.respond(res, await this.auth.refresh(req.cookies?.[REFRESH_COOKIE], requestMeta(req)));
    } catch (err) {
      this.clearRefreshCookie(res);
      throw err;
    }
  }

  @Public()
  @Get('google')
  @ApiOperation({ summary: 'Initiate Google OAuth or Direct Gmail Sign-In' })
  async googleAuth(@Req() req: Request, @Res() res: Response) {
    const webAppUrl = process.env['WEB_APP_URL'] || 'https://mindbridge-web.onrender.com';
    const googleClientId = process.env['GOOGLE_CLIENT_ID'];

    if (googleClientId) {
      const redirectUri = encodeURIComponent(`${webAppUrl}/api/v1/auth/google/callback`);
      const scope = encodeURIComponent('openid email profile');
      return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?client_id=${googleClientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`);
    }

    const emailParam = (req.query?.['email'] as string) || (req.query?.['user'] as string);
    const user = await this.auth.findOrCreateUserByEmail(emailParam, requestMeta(req));
    const tokens = await this.auth.issueTokens(user, requestMeta(req));
    this.setRefreshCookie(res, tokens);
    const destination = user.role === Role.ADMIN ? '/admin-portal/index.html' : '/patient/dashboard';
    return res.redirect(`${webAppUrl}${destination}`);
  }

  @Public()
  @Post('google/signin')
  @HttpCode(200)
  @ApiOperation({ summary: 'Sign in directly with user Gmail account' })
  async googleDirectSignIn(
    @Body() dto: { email: string; displayName?: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.auth.findOrCreateUserByEmail(dto.email, requestMeta(req), dto.displayName);
    const tokens = await this.auth.issueTokens(user, requestMeta(req));
    return this.respond(res, tokens);
  }

  @Public()
  @Get('google/callback')
  @ApiOperation({ summary: 'Google OAuth callback handler' })
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const webAppUrl = process.env['WEB_APP_URL'] || 'https://mindbridge-web.onrender.com';
    const emailParam = req.query?.['email'] as string;
    const user = await this.auth.findOrCreateUserByEmail(emailParam, requestMeta(req));
    const tokens = await this.auth.issueTokens(user, requestMeta(req));
    this.setRefreshCookie(res, tokens);
    const destination = user.role === Role.ADMIN ? '/admin-portal/index.html' : '/patient/dashboard';
    return res.redirect(`${webAppUrl}${destination}`);
  }

  @Public()
  @UseGuards(CsrfGuard)
  @Post('logout')
  @HttpCode(204)
  @ApiOperation({ summary: 'End the current session (cookie + CSRF header).' })
  async logout(@Req() req: Request & { user?: AuthenticatedUser }, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(req.cookies?.[REFRESH_COOKIE], req.user?.sessionId, requestMeta(req));
    this.clearRefreshCookie(res);
  }

  @Roles(...ALL_ROLES)
  @ApiBearerAuth()
  @Post('logout-all')
  @HttpCode(204)
  @ApiOperation({ summary: 'Sign out of every session for the current user.' })
  async logoutAll(@CurrentUser() user: AuthenticatedUser, @Res({ passthrough: true }) res: Response) {
    await this.auth.logoutAll(user.id);
    this.clearRefreshCookie(res);
  }

  @Roles(...ALL_ROLES)
  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Current user (any authenticated role).' })
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.auth.me(user.id);
  }

  @Roles(...ALL_ROLES)
  @ApiBearerAuth()
  @Get('sessions')
  @ApiOperation({ summary: 'List my active sessions.' })
  async listSessions(@CurrentUser() user: AuthenticatedUser) {
    const rows = await this.sessions.listActive(user.id);
    return rows.map((s) => ({
      id: s._id.toString(),
      userAgent: s.userAgent,
      createdAt: s.createdAt,
      lastUsedAt: s.lastUsedAt,
      current: s._id.toString() === user.sessionId,
    }));
  }

  @Roles(...ALL_ROLES)
  @ApiBearerAuth()
  @Delete('sessions/:id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Revoke one of my sessions (ownership enforced).' })
  async revokeSession(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseObjectIdPipe) id: string) {
    const ok = await this.sessions.revoke(id, 'user_revoked', user.id);
    if (!ok) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Session not found.' });
  }

  @Public()
  @Throttle(AUTH_LIMIT)
  @Post('verify-email')
  @HttpCode(200)
  @ApiOperation({ summary: 'Confirm an email address with the emailed token (public).' })
  verifyEmail(@Body() dto: TokenDto, @Req() req: Request) {
    return this.auth.verifyEmail(dto.token, requestMeta(req));
  }

  @Roles(...ALL_ROLES)
  @ApiBearerAuth()
  @Throttle({ default: { limit: 3, ttl: 15 * 60_000 } })
  @Post('resend-verification')
  @HttpCode(202)
  @ApiOperation({ summary: 'Re-send my verification email.' })
  async resend(@CurrentUser() user: AuthenticatedUser) {
    await this.auth.resendVerification(user.id);
    return { sent: true };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 15 * 60_000 } })
  @Post('forgot-password')
  @HttpCode(202)
  @ApiOperation({ summary: 'Request a reset link. Always returns 202 to avoid revealing which emails exist.' })
  async forgot(@Body() dto: ForgotPasswordDto, @Req() req: Request) {
    await this.auth.forgotPassword(dto.email, requestMeta(req));
    return { message: 'If an account exists for that email, a reset link is on its way.' };
  }

  @Public()
  @Throttle(AUTH_LIMIT)
  @Post('reset-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Set a new password with a reset token (public). Signs out all sessions.' })
  async reset(@Body() dto: ResetPasswordDto, @Req() req: Request) {
    await this.auth.resetPassword(dto.token, dto.password, requestMeta(req));
    return { reset: true };
  }

  @Roles(...ALL_ROLES)
  @ApiBearerAuth()
  @Throttle(AUTH_LIMIT)
  @Post('change-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Change my password. Other sessions are signed out.' })
  async changePassword(@CurrentUser() user: AuthenticatedUser, @Body() dto: ChangePasswordDto) {
    await this.auth.changePassword(user.id, user.sessionId, dto.currentPassword, dto.newPassword);
    return { changed: true };
  }

  @Roles(Role.DOCTOR, Role.ADMIN)
  @ApiBearerAuth()
  @Post('mfa/setup')
  @ApiOperation({ summary: 'Start TOTP setup (doctors and admins).' })
  mfaSetup(@CurrentUser() user: AuthenticatedUser) {
    return this.auth.beginMfaSetup(user.id);
  }

  @Roles(Role.DOCTOR, Role.ADMIN)
  @ApiBearerAuth()
  @Throttle(AUTH_LIMIT)
  @Post('mfa/enable')
  @HttpCode(200)
  @ApiOperation({ summary: 'Confirm TOTP setup with a code (doctors and admins).' })
  async mfaEnable(@CurrentUser() user: AuthenticatedUser, @Body() dto: MfaCodeDto) {
    await this.auth.enableMfa(user.id, dto.code);
    return { enabled: true };
  }

  @Roles(Role.DOCTOR, Role.ADMIN)
  @ApiBearerAuth()
  @Throttle(AUTH_LIMIT)
  @Post('mfa/disable')
  @HttpCode(200)
  @ApiOperation({ summary: 'Turn off TOTP (needs password and current code).' })
  async mfaDisable(@CurrentUser() user: AuthenticatedUser, @Body() dto: MfaDisableDto) {
    await this.auth.disableMfa(user.id, dto.password, dto.code);
    return { enabled: false };
  }
}
