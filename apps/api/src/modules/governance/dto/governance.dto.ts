import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';
import type {
  CouncilApplicationCredentials,
  CouncilTaskProof,
  DynamicFeatureItem,
  DynamicSiteSettings,
} from '@mindbridge/shared-types';

export class UpdateSettingsDto {
  @IsOptional()
  @IsObject()
  announcementBanner?: DynamicSiteSettings['announcementBanner'];

  @IsOptional()
  @IsObject()
  statsOverride?: DynamicSiteSettings['statsOverride'];

  @IsOptional()
  @IsObject()
  featuredNgos?: DynamicSiteSettings['featuredNgos'];

  @IsOptional()
  @IsBoolean()
  maintenanceMode?: boolean;

  @IsOptional()
  dynamicFeatures?: DynamicFeatureItem[];

  @IsOptional()
  @IsObject()
  policies?: {
    terms?: string;
    privacy?: string;
    ai?: string;
  };
}

export class UpdatePoliciesDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100000)
  terms?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100000)
  privacy?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100000)
  ai?: string;
}

export class ApproveDoctorDto {
  @ApiProperty({
    description: 'Mandatory clinical evidence note justifying professional verification.',
    example: 'Verified MBBS & MD Psychiatry degrees with NMC register on 2026-11-06.',
  })
  @IsString()
  @Length(5, 1000, { message: 'An evidence note of at least 5 characters is required.' })
  evidenceNote!: string;

  @ApiProperty({
    description: 'Mandatory boolean confirming that the official medical / clinical council registry was inspected.',
    example: true,
  })
  @IsBoolean({ message: 'Confirmation that the external register was checked must be provided.' })
  externalRegisterChecked!: boolean;
}

export class ReviewApplicationDto {
  @ApiProperty({ enum: ['APPROVED', 'REJECTED'] })
  @IsIn(['APPROVED', 'REJECTED'])
  decision!: 'APPROVED' | 'REJECTED';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class SubmitProofDto {
  @ApiProperty()
  @IsObject()
  proof!: CouncilTaskProof;
}

export class VerifyProofDto {
  @ApiProperty({ enum: ['VERIFIED', 'REVISION_REQUESTED'] })
  @IsIn(['VERIFIED', 'REVISION_REQUESTED'])
  decision!: 'VERIFIED' | 'REVISION_REQUESTED';
}

export class PlanFeatureDto {
  @ApiProperty({ example: 'Create an exam stress support initiative' })
  @IsString()
  @Length(3, 500)
  prompt!: string;
}

export class ToggleFeatureDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class DestructiveActionDto {
  @ApiProperty({
    required: false,
    description: 'Fresh 6-digit TOTP code (can also be passed in x-totp-code header).',
    example: '123456',
  })
  @IsOptional()
  @Matches(/^\d{6}$/, { message: 'TOTP code must be exactly 6 digits.' })
  totpCode?: string;
}
