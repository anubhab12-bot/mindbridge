import { DoctorRejectionReason } from '@mindbridge/shared-types';
import { IsBoolean, IsIn, IsOptional, IsString, Length } from 'class-validator';

export class ApproveDoctorVerificationDto {
  @IsBoolean()
  externalRegisterChecked!: boolean;

  @IsString()
  @Length(5, 300, { message: 'External register reference/URL must be at least 5 characters.' })
  externalRegisterReference!: string;

  @IsString()
  @Length(5, 2000, { message: 'A verification evidence note (at least 5 characters) is mandatory.' })
  evidenceNote!: string;

  @IsOptional()
  @IsString()
  totpCode?: string;
}

export class RejectDoctorVerificationDto {
  @IsIn(Object.values(DoctorRejectionReason), { message: 'A valid rejection reason code from the fixed list is required.' })
  reasonCode!: DoctorRejectionReason;

  @IsString()
  @Length(5, 1000, { message: 'A rejection note for the applicant (at least 5 characters) is required.' })
  rejectionNote!: string;
}

export class RequestInfoDoctorVerificationDto {
  @IsString()
  @Length(5, 1000, { message: 'Please specify the information needed (at least 5 characters).' })
  reason!: string;
}
