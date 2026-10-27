import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProfessionalCategory, SELF_REGISTRABLE_ROLES, type SelfRegistrableRole } from '@mindbridge/shared-types';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  Equals,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const lowerTrim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value);

export class DoctorRegistrationDto {
  @ApiProperty({ enum: Object.values(ProfessionalCategory) })
  @IsIn(Object.values(ProfessionalCategory))
  professionalCategory!: ProfessionalCategory;

  @ApiProperty({ example: ['MBBS', 'MD Psychiatry'] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  qualifications!: string[];

  @ApiProperty({ example: 'REG-000000' })
  @Transform(trim)
  @IsString()
  @Length(3, 60)
  @Matches(/^[A-Za-z0-9/\-. ]+$/, { message: 'Registration number contains unsupported characters.' })
  registrationNumber!: string;

  @ApiProperty({ example: 'State Medical Council' })
  @Transform(trim)
  @IsString()
  @Length(2, 120)
  registrationCouncil!: string;

  @ApiProperty({ example: ['Anxiety', 'Depression'] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  specialties!: string[];

  @ApiProperty({ example: 5 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(70)
  yearsExperience!: number;

  @ApiProperty({ example: ['en', 'hi'] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(10, { each: true })
  languages!: string[];
}

export class RegisterDto {
  @ApiProperty({ enum: SELF_REGISTRABLE_ROLES, description: 'ADMIN cannot be self-registered.' })
  @IsIn(SELF_REGISTRABLE_ROLES as unknown as string[], { message: 'Choose Patient or Doctor.' })
  role!: SelfRegistrableRole;

  @ApiProperty({ example: 'Asha' })
  @Transform(trim)
  @IsString()
  @Length(1, 80)
  displayName!: string;

  @ApiProperty({ example: 'asha@example.test' })
  @Transform(lowerTrim)
  @IsEmail({}, { message: 'Enter a valid email address.' })
  @MaxLength(254)
  email!: string;

  @ApiProperty({ minLength: 10, maxLength: 128 })
  @IsString()
  @MinLength(10)
  @MaxLength(128)
  password!: string;

  @ApiProperty({ description: 'Must be true.' })
  @Equals(true, { message: 'You need to accept the terms of service.' })
  acceptTerms!: boolean;

  @ApiProperty({ description: 'Must be true.' })
  @Equals(true, { message: 'You need to accept the privacy policy.' })
  acceptPrivacy!: boolean;

  @ApiPropertyOptional({ description: 'Consent to AI processing of chat messages (needed for the AI companion).' })
  @IsOptional()
  @IsBoolean()
  aiProcessingConsent?: boolean;

  @ApiPropertyOptional({ description: 'Patients must confirm they are 18 or older.' })
  @ValidateIf((o: RegisterDto) => o.role === 'PATIENT')
  @Equals(true, { message: 'MindBridge is currently available to adults (18+) only.' })
  ageConfirmedAdult?: boolean;

  @ApiPropertyOptional({ example: 'Asia/Kolkata' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  @Matches(/^[A-Za-z_]+(\/[A-Za-z_+\-0-9]+){0,2}$|^UTC$/)
  timezone?: string;

  @ApiPropertyOptional({ example: 'IN' })
  @IsOptional()
  @Matches(/^[A-Z]{2}$/)
  country?: string;

  @ApiPropertyOptional({ type: DoctorRegistrationDto })
  @ValidateIf((o: RegisterDto) => o.role === 'DOCTOR')
  @ValidateNested()
  @Type(() => DoctorRegistrationDto)
  doctor?: DoctorRegistrationDto;
}

export class LoginDto {
  @ApiProperty()
  @Transform(lowerTrim)
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password!: string;
}

export class MfaVerifyDto {
  @ApiProperty()
  @IsString()
  @MaxLength(1000)
  mfaToken!: string;

  @ApiProperty({ example: '123456' })
  @Matches(/^\d{6}$/)
  code!: string;
}

export class MfaCodeDto {
  @ApiProperty({ example: '123456' })
  @Matches(/^\d{6}$/)
  code!: string;
}

export class MfaDisableDto extends MfaCodeDto {
  @ApiProperty()
  @IsString()
  @MaxLength(128)
  password!: string;
}

export class TokenDto {
  @ApiProperty()
  @IsString()
  @Length(20, 200)
  token!: string;
}

export class ForgotPasswordDto {
  @ApiProperty()
  @Transform(lowerTrim)
  @IsEmail()
  @MaxLength(254)
  email!: string;
}

export class ResetPasswordDto extends TokenDto {
  @ApiProperty()
  @IsString()
  @MinLength(10)
  @MaxLength(128)
  password!: string;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @MaxLength(128)
  currentPassword!: string;

  @ApiProperty()
  @IsString()
  @MinLength(10)
  @MaxLength(128)
  newPassword!: string;
}
