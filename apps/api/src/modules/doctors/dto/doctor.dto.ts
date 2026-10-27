import { ApiPropertyOptional } from '@nestjs/swagger';
import { ConsultationMode, ProfessionalCategory } from '@mindbridge/shared-types';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto.js';
import { AvailabilityKind } from '../../availability/schemas/availability-slot.schema.js';

export class DoctorSearchQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(60)
  q?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(60)
  specialty?: string;

  @ApiPropertyOptional({ example: 'hi' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  language?: string;

  @ApiPropertyOptional({ enum: Object.values(ProfessionalCategory) })
  @IsOptional()
  @IsIn(Object.values(ProfessionalCategory))
  category?: ProfessionalCategory;

  @ApiPropertyOptional({ enum: Object.values(ConsultationMode) })
  @IsOptional()
  @IsIn(Object.values(ConsultationMode))
  mode?: ConsultationMode;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxFee?: number;

  @ApiPropertyOptional({ description: 'Day of week 0 (Sun) – 6 (Sat) the professional usually works.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  availableOn?: number;
}

export class SlotsQueryDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to!: string;
}

class FeeDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100000)
  amount!: number;

  @IsIn(['INR'])
  currency!: string;
}

export class UpdateDoctorProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  qualifications?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  specialties?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(10, { each: true })
  languages?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(70)
  yearsExperience?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => FeeDto)
  consultationFee?: FeeDto;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsIn(Object.values(ConsultationMode), { each: true })
  consultationModes?: ConsultationMode[];

  @IsOptional()
  @Type(() => Number)
  @IsIn([30, 45, 50, 60, 90])
  slotDurationMinutes?: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  clinicAddress?: string;
}

export class WorkingHoursDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  start!: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  end!: string;
}

export class SetWorkingHoursDto {
  @IsArray()
  @ArrayMaxSize(28)
  @ValidateNested({ each: true })
  @Type(() => WorkingHoursDto)
  workingHours!: WorkingHoursDto[];
}

export class AvailabilityExceptionDto {
  @IsIn(Object.values(AvailabilityKind))
  kind!: AvailabilityKind;

  @IsISO8601({ strict: true })
  @Transform(({ value }) => value)
  startAt!: string;

  @IsISO8601({ strict: true })
  endAt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}

export class RangeQueryDto {
  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;
}
