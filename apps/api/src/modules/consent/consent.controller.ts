import { Body, Controller, Get, NotFoundException, Param, Post } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConsentType, ContentStatus, DoctorVerificationStatus, Role } from '@mindbridge/shared-types';
import { IsBoolean, IsIn, IsMongoId, IsOptional } from 'class-validator';
import type { Model } from 'mongoose';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user.js';
import { CurrentUser, Public, Roles } from '../../common/auth/decorators.js';
import { DoctorProfile } from '../doctors/schemas/doctor-profile.schema.js';
import { ConsentService } from './consent.service.js';
import { PolicyDocument, PolicyDocumentType } from './schemas/policy-document.schema.js';

class UpdateConsentDto {
  @IsIn(Object.values(ConsentType))
  type!: ConsentType;

  @IsBoolean()
  granted!: boolean;

  @IsOptional()
  @IsMongoId()
  doctorId?: string;
}

/** Consents users may change themselves. Terms/privacy are re-accepted, not withdrawn, from here. */
const SELF_SERVICE_CONSENTS: ConsentType[] = [
  ConsentType.AI_PROCESSING,
  ConsentType.SHARE_MOOD_SUMMARY,
  ConsentType.SHARE_AI_SUMMARY,
  ConsentType.SHARE_INTAKE,
  ConsentType.MODEL_TRAINING,
  ConsentType.REMINDERS,
  ConsentType.DOCTOR_AI_ASSIST,
  ConsentType.TERMS,
  ConsentType.PRIVACY_POLICY,
];

@ApiTags('consent')
@Controller({ version: '1' })
export class ConsentController {
  constructor(
    private readonly consent: ConsentService,
    @InjectModel(DoctorProfile.name) private readonly doctors: Model<DoctorProfile>,
    @InjectModel(PolicyDocument.name) private readonly policies: Model<PolicyDocument>,
  ) {}

  @ApiBearerAuth()
  @Roles(Role.PATIENT, Role.DOCTOR, Role.ADMIN)
  @Get('consents/me')
  @ApiOperation({ summary: 'My current consent states (owner only).' })
  mine(@CurrentUser() user: AuthenticatedUser) {
    return this.consent.currentStates(user.id);
  }

  @ApiBearerAuth()
  @Roles(Role.PATIENT, Role.DOCTOR, Role.ADMIN)
  @Get('consents/me/history')
  @ApiOperation({ summary: 'My full consent history (owner only).' })
  history(@CurrentUser() user: AuthenticatedUser) {
    return this.consent.history(user.id);
  }

  @ApiBearerAuth()
  @Roles(Role.PATIENT, Role.DOCTOR, Role.ADMIN)
  @Post('consents')
  @ApiOperation({ summary: 'Grant or withdraw one of my consents. Doctor-scoped consents must name an approved professional.' })
  async update(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateConsentDto) {
    if (!SELF_SERVICE_CONSENTS.includes(dto.type)) throw new NotFoundException();
    if ((dto.type === ConsentType.TERMS || dto.type === ConsentType.PRIVACY_POLICY) && !dto.granted) {
      // Withdrawing acceptance of the terms means closing the account; that goes through account deletion.
      throw new NotFoundException({ code: 'USE_ACCOUNT_DELETION', message: 'To withdraw, request account deletion from Privacy settings.' });
    }
    if (dto.doctorId) {
      if (user.role !== Role.PATIENT) throw new NotFoundException();
      const doctor = await this.doctors.exists({ _id: dto.doctorId, verificationStatus: DoctorVerificationStatus.APPROVED });
      // Withdrawals are always allowed (even if the professional was since suspended).
      if (!doctor && dto.granted) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Professional not found.' });
    }
    return this.consent.record(user.id, dto.type, dto.granted, { doctorId: dto.doctorId ?? null, source: 'settings' });
  }

  @Public()
  @Get('policies/:type')
  @ApiOperation({ summary: 'Current published policy text (public).' })
  async policy(@Param('type') type: string) {
    if (!(Object.values(PolicyDocumentType) as string[]).includes(type)) throw new NotFoundException();
    const doc = await this.policies
      .findOne({ type: type as PolicyDocumentType, status: ContentStatus.PUBLISHED, effectiveAt: { $lte: new Date() } })
      .sort({ effectiveAt: -1 })
      .select('type version title body effectiveAt')
      .lean();
    if (!doc) throw new NotFoundException({ code: 'NOT_FOUND', message: 'No published version yet.' });
    return doc;
  }
}
