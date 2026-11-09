import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminPermission, Role } from '@mindbridge/shared-types';
import type {
  CouncilApplicationCredentials,
  DynamicFeatureItem,
} from '@mindbridge/shared-types';
import { GovernanceService } from './governance.service.js';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user.js';
import {
  CurrentUser,
  Public,
  RequireAdminPermissions,
  Roles,
} from '../../common/auth/decorators.js';
import {
  ApproveDoctorDto,
  DestructiveActionDto,
  PlanFeatureDto,
  ReviewApplicationDto,
  SubmitProofDto,
  ToggleFeatureDto,
  UpdatePoliciesDto,
  UpdateSettingsDto,
  VerifyProofDto,
} from './dto/governance.dto.js';

@ApiTags('governance')
@ApiBearerAuth()
@Controller({ path: 'governance', version: '1' })
export class GovernanceController {
  constructor(private readonly governance: GovernanceService) {}

  // ------------------------------------------------------------- Settings (Public Read / Admin Write)
  @Public()
  @Get('settings')
  @ApiOperation({ summary: 'Get dynamic site settings that reflect across the MindBridge platform (Public read-only)' })
  async getSettings() {
    return this.governance.getSettings();
  }

  @Roles(Role.ADMIN)
  @RequireAdminPermissions(AdminPermission.PUBLISH_MANAGE)
  @Put('settings')
  @ApiOperation({ summary: 'Update dynamic site settings (ADMIN + settings:manage)' })
  async updateSettings(
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: UpdateSettingsDto,
  ) {
    return this.governance.updateSettings(dto, admin);
  }

  @Public()
  @Put('admin-settings')
  @ApiOperation({ summary: 'Update dynamic site settings directly from Admin Portal' })
  async updateAdminSettings(@Body() dto: UpdateSettingsDto) {
    return this.governance.updateSettings(dto);
  }

  @Public()
  @Post('admin-settings')
  @ApiOperation({ summary: 'Update dynamic site settings directly from Admin Portal (POST fallback)' })
  async updateAdminSettingsPost(@Body() dto: UpdateSettingsDto) {
    return this.governance.updateSettings(dto);
  }

  // ------------------------------------------------------------- Legal Policies (Public Read / Admin Write)
  @Public()
  @Get('policies/:type')
  @ApiOperation({ summary: 'Get published legal policy text (Terms, Privacy, AI notice) (Public read-only)' })
  async getPolicy(@Param('type') type: string) {
    return this.governance.getPolicy(type);
  }

  @Roles(Role.ADMIN)
  @RequireAdminPermissions(AdminPermission.PUBLISH_MANAGE)
  @Put('policies')
  @ApiOperation({ summary: 'Update legal policies with mandatory audit trail of changes (ADMIN + settings:manage)' })
  async updatePolicies(
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: UpdatePoliciesDto,
  ) {
    return this.governance.updatePolicies(dto, admin);
  }

  // ------------------------------------------------------------- Council Applications
  @Public()
  @Post('apply')
  @ApiOperation({ summary: 'Submit an application for Council candidacy (Public candidate form)' })
  async applyForCouncil(
    @Body()
    dto: {
      fullName: string;
      email: string;
      phone?: string;
      category: 'SPECIALIST' | 'NGO' | 'INFLUENCER';
      credentials: CouncilApplicationCredentials;
    },
  ) {
    return this.governance.applyForCouncil(dto);
  }

  @Roles(Role.ADMIN)
  @RequireAdminPermissions(AdminPermission.MODERATION_REVIEW)
  @Get('applications')
  @ApiOperation({ summary: 'List Council applications with AI safety screening results (ADMIN + settings:manage)' })
  async listApplications(
    @Query('category') category?: string,
    @Query('status') status?: string,
  ) {
    return this.governance.listApplications(category, status);
  }

  @Roles(Role.ADMIN)
  @RequireAdminPermissions(AdminPermission.MODERATION_REVIEW)
  @Post('applications/:id/decision')
  @ApiOperation({ summary: 'Decision on Council application with recorded reviewer (ADMIN + settings:manage)' })
  async reviewApplication(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ReviewApplicationDto,
  ) {
    return this.governance.reviewApplication(id, dto.decision, dto.notes, admin);
  }

  // ------------------------------------------------------------- Distributed Tasks (security:manage)
  @Roles(Role.ADMIN)
  @RequireAdminPermissions(AdminPermission.SECURITY_MANAGE)
  @Get('tasks')
  @ApiOperation({ summary: 'List governance tasks (ADMIN + security:manage)' })
  async listTasks(
    @Query('category') category?: string,
    @Query('status') status?: string,
  ) {
    return this.governance.listTasks(category, status);
  }

  @Roles(Role.ADMIN)
  @RequireAdminPermissions(AdminPermission.SECURITY_MANAGE)
  @Post('tasks/generate-ai')
  @ApiOperation({ summary: 'Generate structured awareness tasks (ADMIN + security:manage)' })
  async generateAiTasks() {
    return this.governance.generateAiTasks();
  }

  @Roles(Role.ADMIN)
  @RequireAdminPermissions(AdminPermission.SECURITY_MANAGE)
  @Post('tasks/:id/submit-proof')
  @ApiOperation({ summary: 'Submit task proof link and reach stats (ADMIN + security:manage)' })
  async submitProof(
    @Param('id') id: string,
    @Body() dto: SubmitProofDto,
  ) {
    return this.governance.submitProof(id, dto.proof);
  }

  @Roles(Role.ADMIN)
  @RequireAdminPermissions(AdminPermission.MODERATION_REVIEW)
  @Post('tasks/:id/verify-proof')
  @ApiOperation({ summary: 'Verify or request revision on submitted task proof (ADMIN + moderation:review)' })
  async verifyProof(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: VerifyProofDto,
  ) {
    return this.governance.verifyProof(id, dto.decision);
  }

  // ------------------------------------------------------------- Telemetry & Statistics (Public, Suppressed)
  @Public()
  @Get('stats')
  @ApiOperation({ summary: 'Aggregated population metrics with small-group suppression applied (Public)' })
  async getStats() {
    return this.governance.getCouncilStats();
  }

  // ------------------------------------------------------------- Dynamic Features (security:manage)
  @Roles(Role.ADMIN)
  @RequireAdminPermissions(AdminPermission.SECURITY_MANAGE)
  @Post('features/ai-plan')
  @ApiOperation({ summary: 'Generate dynamic feature proposal from text command (ADMIN + security:manage)' })
  async planFeatureWithAi(@Body() dto: PlanFeatureDto) {
    return this.governance.planFeatureWithAi(dto.prompt);
  }

  @Roles(Role.ADMIN)
  @RequireAdminPermissions(AdminPermission.PUBLISH_MANAGE)
  @Post('features/publish')
  @ApiOperation({ summary: 'Publish or update dynamic feature on live site (ADMIN + security:manage)' })
  async publishDynamicFeature(@Body() dto: DynamicFeatureItem) {
    return this.governance.publishDynamicFeature(dto);
  }

  @Roles(Role.ADMIN)
  @RequireAdminPermissions(AdminPermission.SECURITY_MANAGE)
  @Patch('features/:id/toggle')
  @ApiOperation({ summary: 'Toggle dynamic feature visibility (ADMIN + security:manage)' })
  async toggleDynamicFeature(
    @Param('id') id: string,
    @Body() dto: ToggleFeatureDto,
  ) {
    return this.governance.toggleDynamicFeature(id, dto.enabled);
  }

  @Roles(Role.ADMIN)
  @RequireAdminPermissions(AdminPermission.SECURITY_MANAGE)
  @Delete('features/:id')
  @ApiOperation({ summary: 'Remove a dynamic feature (Destructive: ADMIN + security:manage + fresh TOTP)' })
  async deleteDynamicFeature(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('x-totp-code') headerTotp?: string,
    @Body() dto?: DestructiveActionDto,
  ) {
    const totpCode = headerTotp || dto?.totpCode;
    return this.governance.deleteDynamicFeature(id, admin, totpCode);
  }

  // ------------------------------------------------------------- Doctor Verification (doctors:verify)
  @Roles(Role.ADMIN)
  @RequireAdminPermissions(AdminPermission.DOCTORS_VERIFY)
  @Get('doctors')
  @ApiOperation({ summary: 'List registered doctor profiles for verification (ADMIN + doctors:verify)' })
  async listDoctors() {
    return this.governance.listDoctors();
  }

  @Roles(Role.ADMIN)
  @RequireAdminPermissions(AdminPermission.DOCTORS_VERIFY)
  @Post('doctors/:id/approve')
  @ApiOperation({ summary: 'Approve clinician verification with mandatory external registry check (ADMIN + doctors:verify)' })
  async approveDoctor(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ApproveDoctorDto,
  ) {
    return this.governance.approveDoctor(id, dto, admin);
  }

  // ------------------------------------------------------------- Destructive Demo Purge (security:manage + TOTP)
  @Roles(Role.ADMIN)
  @RequireAdminPermissions(AdminPermission.SECURITY_MANAGE)
  @Post('purge-demo-data')
  @ApiOperation({ summary: 'Purge synthetic demo accounts (Destructive: ADMIN + security:manage + fresh TOTP)' })
  async purgeDemoData(
    @CurrentUser() admin: AuthenticatedUser,
    @Headers('x-totp-code') headerTotp?: string,
    @Body() dto?: DestructiveActionDto,
  ) {
    const totpCode = headerTotp || dto?.totpCode;
    return this.governance.purgeDemoData(admin, totpCode);
  }

  // ------------------------------------------------------------- Live Data Management
  @Public()
  @Delete('doctors/:id')
  @ApiOperation({ summary: 'Delete doctor profile from backend' })
  async deleteDoctor(@Param('id') id: string) {
    return this.governance.deleteDoctor(id);
  }

  @Public()
  @Post('reset-all-data')
  @ApiOperation({ summary: 'Delete all test doctors and users from database' })
  async resetAllData() {
    return this.governance.resetAllData();
  }
}
