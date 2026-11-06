import {
  AdminPermission,
  AdminRolePreset,
  ALL_ADMIN_PERMISSIONS,
  RiskLevel,
  SafetyEventStatus,
} from '@mindbridge/shared-types';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDate,
  IsIn,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class AdminRolePresetDto {
  @IsIn(Object.values(AdminRolePreset))
  preset!: AdminRolePreset;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  rationale?: string;
}

export class ProposePromotionDto {
  @IsMongoId()
  targetUserId!: string;

  @IsIn(Object.values(AdminRolePreset))
  preset!: AdminRolePreset;

  @IsString()
  @MaxLength(500)
  rationale!: string;
}

export class RejectPromotionDto {
  @IsString()
  @MaxLength(500)
  reason!: string;
}

export class SafetyQueryDto {
  @IsOptional()
  @IsIn(Object.values(SafetyEventStatus))
  status?: SafetyEventStatus;

  @IsOptional()
  @IsIn(Object.values(RiskLevel))
  risk?: RiskLevel;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;
}

export class PatchSafetyEventDto {
  @IsIn(['assign', 'resolve', 'escalate'])
  action!: 'assign' | 'resolve' | 'escalate';

  @ValidateIf((o) => o.action === 'assign')
  @IsNotEmpty({ message: 'assigneeUserId is required when assigning a safety event.' })
  @IsMongoId()
  assigneeUserId?: string;

  @ValidateIf((o) => o.action === 'resolve')
  @IsNotEmpty({ message: 'outcomeReasonCode is mandatory when resolving a safety event.' })
  @IsString()
  @MaxLength(100)
  outcomeReasonCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
