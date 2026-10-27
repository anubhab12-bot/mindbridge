import { BadRequestException, Body, Controller, Get, Patch } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@mindbridge/shared-types';
import { IsBoolean, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';
import { type Model, Types } from 'mongoose';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user.js';
import { CurrentUser, Roles } from '../../common/auth/decorators.js';
import { FieldEncryptionService } from '../../common/crypto/field-encryption.service.js';
import { isValidTimeZone } from '../../common/utils/dates.js';
import { AuditService } from '../audit/audit.service.js';
import { PatientProfile } from '../patients/schemas/patient-profile.schema.js';
import { User } from './schemas/user.schema.js';

class UpdateAccountDto {
  @IsOptional() @IsString() @Length(2, 80) displayName?: string;
  @IsOptional() @IsString() @MaxLength(64) timezone?: string;
  @IsOptional() @Matches(/^[a-z]{2}(-[A-Z]{2})?$/) locale?: string;
  @IsOptional() @Matches(/^[A-Z]{2}$/) country?: string;
}

class UpdatePatientProfileDto {
  @IsOptional() @IsString() @MaxLength(40) pronouns?: string;
  @IsOptional() @Matches(/^[a-z]{2,3}$/) preferredLanguage?: string;
  @IsOptional() @IsString() @MaxLength(80) region?: string;
  /** Free text, encrypted; never shared automatically with anyone. Empty string clears it. */
  @IsOptional() @IsString() @MaxLength(200) trustedContact?: string;
  @IsOptional() @IsBoolean() moodRemindersEnabled?: boolean;
  @IsOptional() @IsBoolean() showReadReceipts?: boolean;
}

@ApiTags('account')
@ApiBearerAuth()
@Controller({ version: '1' })
export class AccountController {
  constructor(
    @InjectModel(User.name) private readonly users: Model<User>,
    @InjectModel(PatientProfile.name) private readonly profiles: Model<PatientProfile>,
    private readonly crypto: FieldEncryptionService,
    private readonly audit: AuditService,
  ) {}

  @Patch('users/me')
  @Roles(Role.PATIENT, Role.DOCTOR, Role.ADMIN)
  @ApiOperation({ summary: 'Update my name, timezone, language or country (own account).' })
  async updateAccount(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateAccountDto) {
    if (dto.timezone && !isValidTimeZone(dto.timezone)) {
      throw new BadRequestException({ code: 'INVALID_TIMEZONE', message: 'Unknown timezone.' });
    }
    const set = Object.fromEntries(Object.entries(dto).filter(([, v]) => v !== undefined));
    const u = await this.users.findByIdAndUpdate(user.id, { $set: set }, { new: true, runValidators: true }).select('displayName timezone locale country').lean();
    await this.audit.record({ actorId: user.id, actorRole: user.role, action: 'account.updated', metadata: { fields: Object.keys(set) } });
    return u;
  }

  @Get('patients/me/profile')
  @Roles(Role.PATIENT)
  @ApiOperation({ summary: 'My patient profile (PATIENT, own data).' })
  async getProfile(@CurrentUser() user: AuthenticatedUser) {
    const p = await this.profiles.findOne({ userId: new Types.ObjectId(user.id) }).lean();
    return p ? this.view(p) : null;
  }

  @Patch('patients/me/profile')
  @Roles(Role.PATIENT)
  @ApiOperation({ summary: 'Update my patient profile (PATIENT, own data).' })
  async updateProfile(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdatePatientProfileDto) {
    const { trustedContact, ...rest } = dto;
    const set: Record<string, unknown> = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined));
    const unset: Record<string, 1> = {};
    if (trustedContact !== undefined) {
      if (trustedContact.trim()) set['trustedContactEnc'] = this.crypto.encrypt(trustedContact.trim());
      else unset['trustedContactEnc'] = 1;
    }
    const p = await this.profiles
      .findOneAndUpdate({ userId: new Types.ObjectId(user.id) }, { $set: set, ...(Object.keys(unset).length ? { $unset: unset } : {}) }, { new: true, runValidators: true })
      .lean();
    return p ? this.view(p) : null;
  }

  private view(p: PatientProfile) {
    return {
      pronouns: p.pronouns ?? null,
      preferredLanguage: p.preferredLanguage,
      region: p.region ?? null,
      trustedContact: this.crypto.decryptOptional(p.trustedContactEnc) ?? null,
      moodRemindersEnabled: p.moodRemindersEnabled,
      showReadReceipts: p.showReadReceipts,
    };
  }
}
