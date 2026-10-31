import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppointmentStatus, ConsultationMode, Role } from '@mindbridge/shared-types';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsMongoId,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user.js';
import { CurrentUser, RequireEmailVerified, RequireVerifiedDoctor, Roles } from '../../common/auth/decorators.js';
import { PaginationQueryDto } from '../../common/dto/pagination.dto.js';
import { Paginated } from '../../common/interceptors/response-envelope.interceptor.js';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe.js';
import { AppointmentsService } from './appointments.service.js';
import { RequireFeature } from '../feature-flags/require-feature.js';

class IntakeDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  mainConcerns!: string;

  @IsOptional() @IsString() @MaxLength(1000) goals?: string;
  @IsOptional() @IsString() @MaxLength(200) duration?: string;
  @IsOptional() @IsString() @MaxLength(1000) previousSupport?: string;
  @IsOptional() @IsString() @MaxLength(500) currentMedicationsMentioned?: string;
  @IsOptional() @IsString() @MaxLength(20) preferredLanguage?: string;
  @IsOptional() @IsString() @MaxLength(1000) anythingElse?: string;
}

class BookAppointmentDto {
  @IsMongoId()
  doctorId!: string;

  @IsISO8601({ strict: true })
  startAt!: string;

  @IsIn(Object.values(ConsultationMode))
  mode!: ConsultationMode;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reasonForVisit?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  @Matches(/^[A-Za-z_]+(\/[A-Za-z_+\-0-9]+){0,2}$|^UTC$/)
  patientTimezone?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => IntakeDto)
  intake?: IntakeDto;

  @IsOptional()
  @IsBoolean()
  shareIntake?: boolean;
}

class ReasonDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

class BookTelehealthDto {
  @IsMongoId()
  doctorId!: string;

  @IsOptional()
  @IsString()
  startAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

class UpdateAppointmentDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reasonForVisit?: string;
}

class RescheduleDto {
  @IsISO8601({ strict: true })
  startAt!: string;
}

class CompleteDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  summary?: string;

  @IsBoolean()
  followUpRecommended!: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(52)
  followUpInWeeks?: number;
}

class FeedbackDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}

class PatientAppointmentsQuery extends PaginationQueryDto {
  @IsOptional()
  @IsIn(['upcoming', 'past', 'all'])
  scope: 'upcoming' | 'past' | 'all' = 'upcoming';
}

class DoctorAppointmentsQuery extends PaginationQueryDto {
  @IsOptional() @IsISO8601() from?: string;
  @IsOptional() @IsISO8601() to?: string;
  @IsOptional() @IsIn(Object.values(AppointmentStatus)) status?: AppointmentStatus;
}

@ApiTags('appointments')
@ApiBearerAuth()
@Controller({ version: '1' })
export class AppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}

  @Roles(Role.PATIENT)
  @RequireEmailVerified()
  @Post('appointments')
  @RequireFeature('booking.enabled')
  @ApiOperation({ summary: 'Request an appointment with a verified professional (PATIENT, verified email).' })
  book(@CurrentUser() user: AuthenticatedUser, @Body() dto: BookAppointmentDto) {
    return this.appointments.book(user, dto);
  }

  @Roles(Role.PATIENT)
  @RequireEmailVerified()
  @Post('appointments/telehealth')
  @ApiOperation({ summary: 'Schedule a 1-on-1 video call and email meeting links to patient and doctor (PATIENT).' })
  bookTelehealth(@CurrentUser() user: AuthenticatedUser, @Body() dto: BookTelehealthDto) {
    return this.appointments.bookTelehealth(user, dto.doctorId, dto.startAt, dto.reason);
  }

  @Roles(Role.PATIENT)
  @Get('patients/appointments')
  @ApiOperation({ summary: 'My appointments (PATIENT, own).' })
  async patientList(@CurrentUser() user: AuthenticatedUser, @Query() q: PatientAppointmentsQuery) {
    const { items, total } = await this.appointments.listForPatient(user, q.scope, q.skip, q.pageSize);
    return Paginated.of(items, total, q.page, q.pageSize);
  }

  @Roles(Role.DOCTOR)
  @RequireVerifiedDoctor()
  @Get('doctors/me/appointments')
  @ApiOperation({ summary: 'My schedule and requests (approved DOCTOR, own).' })
  async doctorList(@CurrentUser() user: AuthenticatedUser, @Query() q: DoctorAppointmentsQuery) {
    const { items, total } = await this.appointments.listForDoctor(user, {
      from: q.from ? new Date(q.from) : undefined,
      to: q.to ? new Date(q.to) : undefined,
      status: q.status,
      skip: q.skip,
      limit: q.pageSize,
    });
    return Paginated.of(items, total, q.page, q.pageSize);
  }

  @Roles(Role.DOCTOR)
  @RequireVerifiedDoctor()
  @Get('doctors/me/appointment-stats')
  @ApiOperation({ summary: 'My consultation counts by status (approved DOCTOR, own).' })
  stats(@CurrentUser() user: AuthenticatedUser) {
    return this.appointments.doctorStats(user);
  }

  @Roles(Role.PATIENT, Role.DOCTOR)
  @Get('appointments/:id')
  @ApiOperation({ summary: 'Appointment detail (participant only: booking patient or the professional).' })
  get(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseObjectIdPipe) id: string) {
    return this.appointments.getForParticipant(user, id);
  }

  @Roles(Role.PATIENT)
  @Patch('appointments/:id')
  @ApiOperation({ summary: 'Edit my reason for visit (PATIENT, own, while active).' })
  update(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseObjectIdPipe) id: string, @Body() dto: UpdateAppointmentDto) {
    return this.appointments.updateReason(user, id, dto.reasonForVisit);
  }

  @Roles(Role.PATIENT, Role.DOCTOR)
  @Post('appointments/:id/cancel')
  @HttpCode(200)
  @ApiOperation({ summary: 'Cancel (participant only). Late patient cancellations are flagged per policy.' })
  cancel(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseObjectIdPipe) id: string, @Body() dto: ReasonDto) {
    return this.appointments.cancel(user, id, dto.reason);
  }

  @Roles(Role.PATIENT, Role.DOCTOR)
  @Post('appointments/:id/reschedule')
  @HttpCode(200)
  @ApiOperation({ summary: 'Move to another free slot (participant only, policy window applies).' })
  reschedule(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseObjectIdPipe) id: string, @Body() dto: RescheduleDto) {
    return this.appointments.reschedule(user, id, dto.startAt);
  }

  @Roles(Role.DOCTOR)
  @RequireVerifiedDoctor()
  @Post('appointments/:id/confirm')
  @HttpCode(200)
  @ApiOperation({ summary: 'Accept a request; establishes the care relationship (approved DOCTOR, own).' })
  confirm(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseObjectIdPipe) id: string) {
    return this.appointments.confirm(user, id);
  }

  @Roles(Role.DOCTOR)
  @RequireVerifiedDoctor()
  @Post('appointments/:id/decline')
  @HttpCode(200)
  @ApiOperation({ summary: 'Decline a request (approved DOCTOR, own).' })
  decline(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseObjectIdPipe) id: string, @Body() dto: ReasonDto) {
    return this.appointments.decline(user, id, dto.reason);
  }

  @Roles(Role.DOCTOR)
  @RequireVerifiedDoctor()
  @Post('appointments/:id/complete')
  @HttpCode(200)
  @ApiOperation({ summary: 'Record the outcome and mark completed (approved DOCTOR, own).' })
  complete(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseObjectIdPipe) id: string, @Body() dto: CompleteDto) {
    return this.appointments.complete(user, id, dto);
  }

  @Roles(Role.DOCTOR)
  @RequireVerifiedDoctor()
  @Post('appointments/:id/no-show')
  @HttpCode(200)
  @ApiOperation({ summary: 'Mark a confirmed appointment as no-show (approved DOCTOR, own).' })
  noShow(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseObjectIdPipe) id: string) {
    return this.appointments.markNoShow(user, id);
  }

  @Roles(Role.PATIENT, Role.DOCTOR)
  @Get('appointments/:id/video-access')
  @ApiOperation({ summary: 'Short-lived video join link (participant only; disabled unless a provider is configured).' })
  video(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseObjectIdPipe) id: string) {
    return this.appointments.videoAccess(user, id);
  }

  @Roles(Role.PATIENT, Role.DOCTOR)
  @Post('appointments/:id/resend-video')
  @ApiOperation({ summary: 'Resend video meeting link email to patient and doctor.' })
  resendVideo(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseObjectIdPipe) id: string) {
    return this.appointments.resendVideoLink(user, id);
  }

  @Roles(Role.PATIENT)
  @Post('appointments/:id/feedback')
  @ApiOperation({ summary: 'Rate a completed consultation; moderated before it counts (PATIENT, own).' })
  feedback(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseObjectIdPipe) id: string, @Body() dto: FeedbackDto) {
    return this.appointments.submitFeedback(user, id, dto.rating, dto.comment);
  }
}
