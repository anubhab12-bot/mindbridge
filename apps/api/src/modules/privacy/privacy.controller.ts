import { Body, Controller, Delete, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Role } from '@mindbridge/shared-types';
import { IsIn, IsString, MaxLength } from 'class-validator';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user.js';
import { CurrentUser, Roles } from '../../common/auth/decorators.js';
import { type ErasableCategory, PrivacyService } from './privacy.service.js';

class DeletionRequestDto {
  @IsString()
  @MaxLength(128)
  password!: string;
}

class CategoryParam {
  @IsIn(['mood', 'journal', 'ai_conversations'])
  category!: ErasableCategory;
}

@ApiTags('privacy')
@ApiBearerAuth()
@Roles(Role.PATIENT, Role.DOCTOR)
@Controller({ path: 'privacy', version: '1' })
export class PrivacyController {
  constructor(private readonly privacy: PrivacyService) {}

  @Get('export')
  @Throttle({ default: { limit: 3, ttl: 3_600_000 } })
  @ApiOperation({ summary: 'Download all my personal data as JSON (PATIENT/DOCTOR, own data).' })
  export(@CurrentUser() user: AuthenticatedUser) {
    return this.privacy.export(user);
  }

  @Delete('data/:category')
  @HttpCode(204)
  @ApiOperation({ summary: 'Permanently delete one category of my data now (PATIENT).' })
  async deleteCategory(@CurrentUser() user: AuthenticatedUser, @Param() p: CategoryParam) {
    await this.privacy.deleteCategory(user, p.category);
  }

  @Post('deletion-request')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 3_600_000 } })
  @ApiOperation({ summary: 'Schedule account deletion after the grace period (password required).' })
  request(@CurrentUser() user: AuthenticatedUser, @Body() dto: DeletionRequestDto) {
    return this.privacy.requestDeletion(user, dto.password);
  }

  @Post('deletion-cancel')
  @HttpCode(200)
  @ApiOperation({ summary: 'Cancel a scheduled account deletion.' })
  cancel(@CurrentUser() user: AuthenticatedUser) {
    return this.privacy.cancelDeletion(user);
  }
}
