import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { DoctorProfile, DoctorProfileSchema } from '../doctors/schemas/doctor-profile.schema.js';
import { PatientProfile, PatientProfileSchema } from '../patients/schemas/patient-profile.schema.js';
import { User, UserSchema } from '../users/schemas/user.schema.js';
import { VerificationModule } from '../verification/verification.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { RolesGuard } from './guards/roles.guard.js';
import { PasswordService } from './password.service.js';
import { AuthToken, AuthTokenSchema } from './schemas/auth-token.schema.js';
import { RefreshSession, RefreshSessionSchema } from './schemas/refresh-session.schema.js';
import { SessionService } from './session.service.js';

@Module({
  imports: [
    // Secrets are passed per call from validated config; no default secret is registered.
    JwtModule.register({ signOptions: { algorithm: 'HS256' } }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: PatientProfile.name, schema: PatientProfileSchema },
      { name: DoctorProfile.name, schema: DoctorProfileSchema },
      { name: RefreshSession.name, schema: RefreshSessionSchema },
      { name: AuthToken.name, schema: AuthTokenSchema },
    ]),
    VerificationModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    SessionService,
    JwtAuthGuard,
    // Order matters: authenticate first, then authorize.
    { provide: APP_GUARD, useExisting: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [AuthService, PasswordService, SessionService, JwtAuthGuard, JwtModule],
})
export class AuthModule {}
