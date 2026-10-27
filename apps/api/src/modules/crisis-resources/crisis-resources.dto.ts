import { ApiPropertyOptional } from '@nestjs/swagger';
import { CrisisServiceType } from '@mindbridge/shared-types';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '../../common/dto/pagination.dto.js';

const PHONE = /^[0-9+\-() ]{2,40}$/;

export class CrisisQueryDto {
  @ApiPropertyOptional({ example: 'IN' })
  @IsOptional()
  @Matches(/^[A-Za-z]{2}$/)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  region?: string;
}

export class CreateCrisisResourceDto {
  @IsString()
  @Length(2, 120)
  name!: string;

  @Matches(/^[A-Za-z]{2}$/)
  country!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  region?: string;

  @IsIn(Object.values(CrisisServiceType))
  serviceType!: CrisisServiceType;

  @IsOptional()
  @Matches(PHONE)
  phone?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @Matches(PHONE, { each: true })
  altPhones?: string[];

  @IsOptional()
  @Matches(PHONE)
  sms?: string;

  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  url?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  languages?: string[];

  @IsString()
  @Length(2, 120)
  availability!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  /** The official page the administrator checked. */
  @IsUrl({ protocols: ['https'], require_protocol: true })
  sourceUrl!: string;

  /** When the administrator checked it; defaults to now. Cannot be in the future. */
  @IsOptional()
  @IsDateString()
  verifiedAt?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000)
  priority?: number;
}

export class UpdateCrisisResourceDto implements Partial<CreateCrisisResourceDto> {
  @IsOptional() @IsString() @Length(2, 120) name?: string;
  @IsOptional() @IsString() @MaxLength(80) region?: string;
  @IsOptional() @IsIn(Object.values(CrisisServiceType)) serviceType?: CrisisServiceType;
  @IsOptional() @Matches(PHONE) phone?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(5) @Matches(PHONE, { each: true }) altPhones?: string[];
  @IsOptional() @Matches(PHONE) sms?: string;
  @IsOptional() @IsUrl({ protocols: ['https'], require_protocol: true }) url?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(30) @IsString({ each: true }) languages?: string[];
  @IsOptional() @IsString() @Length(2, 120) availability?: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(1000) priority?: number;
  @IsOptional() @IsIn(['ACTIVE', 'INACTIVE']) status?: 'ACTIVE' | 'INACTIVE';
}

export class VerifyCrisisResourceDto {
  @IsUrl({ protocols: ['https'], require_protocol: true })
  sourceUrl!: string;
}

export class AdminCrisisQueryDto extends PaginationQueryDto {
  @IsOptional() @Matches(/^[A-Za-z]{2}$/) country?: string;
  @IsOptional() @IsIn(['ACTIVE', 'INACTIVE']) status?: 'ACTIVE' | 'INACTIVE';
  /** Only resources whose verification has expired. */
  @IsOptional() @IsIn(['true', 'false']) stale?: 'true' | 'false';
}
