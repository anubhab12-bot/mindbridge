import { Body, Controller, Get, Header, Headers, HttpCode, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccountStatus, AdminPermission, ALL_ADMIN_PERMISSIONS, Role } from '@mindbridge/shared-types';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsDate, IsIn, IsMongoId, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user.js';
import { CurrentUser, RequireAdminPermissions, Roles } from '../../common/auth/decorators.js';
import { PaginationQueryDto } from '../../common/dto/pagination.dto.js';
import { Paginated } from '../../common/interceptors/response-envelope.interceptor.js';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe.js';
import { AuditService, type AuditOutcome } from '../audit/audit.service.js';
import { PolicyDocumentType } from '../consent/schemas/policy-document.schema.js';
import { AdminService } from './admin.service.js';
import { AdminRolePresetDto, PatchSafetyEventDto, ProposePromotionDto, RejectPromotionDto, SafetyQueryDto } from './dto/admin.dto.js';

class UserSearchDto extends PaginationQueryDto {
  @IsOptional() @IsString() @MaxLength(100) q?: string;
  @IsOptional() @IsIn(Object.values(Role)) role?: Role;
  @IsOptional() @IsIn(Object.values(AccountStatus)) status?: AccountStatus;
}

class ReasonDto {
  @IsString() @Length(5, 500) reason!: string;
}

class PermissionsDto {
  @IsArray() @ArrayMaxSize(20) @IsIn(ALL_ADMIN_PERMISSIONS, { each: true }) permissions!: AdminPermission[];
  @IsOptional() @IsString() @MaxLength(500) rationale?: string;
}

class ModerateDto {
  @IsIn(['APPROVED', 'REJECTED']) decision!: 'APPROVED' | 'REJECTED';
}

class PolicyDto {
  @IsIn(Object.values(PolicyDocumentType)) type!: PolicyDocumentType;
  @Matches(/^[0-9A-Za-z.-]{1,20}$/) version!: string;
  @IsString() @Length(3, 200) title!: string;
  @IsString() @Length(20, 100000) body!: string;
}

class PublishDto {
  @IsOptional() @Type(() => Date) @IsDate() effectiveAt?: Date;
}

class AuditQueryDto extends PaginationQueryDto {
  @IsOptional() @IsMongoId() actorId?: string;
  @IsOptional() @Matches(/^[a-z_.]{2,80}$/) action?: string;
  @IsOptional() @IsString() @MaxLength(60) resourceType?: string;
  @IsOptional() @IsString() @MaxLength(60) resourceId?: string;
  @IsOptional() @IsIn(['SUCCESS', 'FAILURE', 'DENIED']) outcome?: AuditOutcome;
  @IsOptional() @Type(() => Date) @IsDate() from?: Date;
  @IsOptional() @Type(() => Date) @IsDate() to?: Date;
}

/** Admin portal API. Every route needs ADMIN plus the named permission. */
@ApiTags('admin')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller({ path: 'admin', version: '1' })
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly audit: AuditService,
  ) {}

  @Get('worklist')
  @ApiOperation({ summary: 'Prioritized operational worklist sorted by potential harm (ADMIN).' })
  worklist() {
    return this.admin.getWorklist();
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Aggregated, small-group-suppressed platform metrics (ADMIN).' })
  dashboard() {
    return this.admin.dashboard();
  }

  @Get('reports/summary.csv')
  @RequireAdminPermissions(AdminPermission.REPORTS_EXPORT)
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="mindbridge-summary.csv"')
  @ApiOperation({ summary: 'Aggregate-only CSV report (ADMIN reports:export).' })
  report(@CurrentUser() user: AuthenticatedUser) {
    return this.admin.exportReportCsv(user);
  }

  @Get('users')
  @RequireAdminPermissions(AdminPermission.USERS_MANAGE)
  @ApiOperation({ summary: 'Search accounts; no health data (ADMIN users:manage).' })
  async users(@Query() q: UserSearchDto) {
    const { items, total } = await this.admin.searchUsers({ q: q.q, role: q.role, status: q.status, skip: q.skip, limit: q.pageSize });
    return Paginated.of(items, total, q.page, q.pageSize);
  }

  @Post('users/:id/suspend')
  @HttpCode(200)
  @RequireAdminPermissions(AdminPermission.USERS_MANAGE)
  @ApiOperation({ summary: 'Suspend an account and end its sessions (ADMIN users:manage).' })
  suspend(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseObjectIdPipe) id: string, @Body() dto: ReasonDto) {
    return this.admin.suspend(user, id, dto.reason);
  }

  @Post('users/:id/reactivate')
  @HttpCode(200)
  @RequireAdminPermissions(AdminPermission.USERS_MANAGE)
  @ApiOperation({ summary: 'Reactivate a suspended account (ADMIN users:manage).' })
  reactivate(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseObjectIdPipe) id: string) {
    return this.admin.reactivate(user, id);
  }

  @Put('users/:id/permissions')
  @RequireAdminPermissions(AdminPermission.ROLES_MANAGE)
  @ApiOperation({ summary: "Change another administrator's permissions (ADMIN roles:manage + TOTP)." })
  permissions(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: PermissionsDto,
    @Headers('x-totp-code') headerTotp?: string,
  ) {
    return this.admin.setAdminPermissions(user, id, dto.permissions, headerTotp, dto.rationale);
  }

  @Put('users/:id/preset')
  @RequireAdminPermissions(AdminPermission.ROLES_MANAGE)
  @ApiOperation({ summary: "Assign an admin role preset to another administrator (ADMIN roles:manage + TOTP)." })
  preset(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: AdminRolePresetDto,
    @Headers('x-totp-code') headerTotp?: string,
  ) {
    return this.admin.setAdminRolePreset(user, id, dto.preset, headerTotp, dto.rationale);
  }

  // --------------------------------------------------------- Maker-Checker Admin Promotion

  @Post('roles/propose')
  @RequireAdminPermissions(AdminPermission.ROLES_MANAGE)
  @ApiOperation({ summary: 'Propose promotion of a user to an administrative role/preset (ADMIN roles:manage + TOTP).' })
  proposePromotion(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ProposePromotionDto,
    @Headers('x-totp-code') headerTotp?: string,
  ) {
    return this.admin.proposeAdminPromotion(user, dto, headerTotp);
  }

  @Get('roles/promotions')
  @RequireAdminPermissions(AdminPermission.ROLES_MANAGE)
  @ApiOperation({ summary: 'List pending admin promotion requests (ADMIN roles:manage).' })
  listPendingPromotions() {
    return this.admin.listPendingPromotions();
  }

  @Post('roles/confirm/:id')
  @HttpCode(200)
  @RequireAdminPermissions(AdminPermission.ROLES_MANAGE)
  @ApiOperation({ summary: 'Confirm an admin promotion by a second Super Admin (ADMIN roles:manage + TOTP).' })
  confirmPromotion(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseObjectIdPipe) id: string,
    @Headers('x-totp-code') headerTotp?: string,
  ) {
    return this.admin.confirmAdminPromotion(user, id, headerTotp);
  }

  @Post('roles/reject/:id')
  @HttpCode(200)
  @RequireAdminPermissions(AdminPermission.ROLES_MANAGE)
  @ApiOperation({ summary: 'Reject an admin promotion proposal (ADMIN roles:manage + TOTP).' })
  rejectPromotion(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: RejectPromotionDto,
    @Headers('x-totp-code') headerTotp?: string,
  ) {
    return this.admin.rejectAdminPromotion(user, id, dto.reason, headerTotp);
  }

  // --------------------------------------------------------- Phase 3: Safety triage endpoints

  @Get('safety-events')
  @RequireAdminPermissions(AdminPermission.SAFETY_TRIAGE)
  @ApiOperation({ summary: 'Safety events for triage board (ADMIN safety:triage). Never contains journal/chat text.' })
  safetyEvents(@Query() q: SafetyQueryDto) {
    return this.admin.getSafetyEvents(q);
  }

  @Post('safety-events/:id/ack')
  @HttpCode(200)
  @RequireAdminPermissions(AdminPermission.SAFETY_TRIAGE)
  @ApiOperation({ summary: 'Acknowledge an unassigned safety event (ADMIN safety:triage).' })
  acknowledgeSafety(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseObjectIdPipe) id: string,
  ) {
    return this.admin.acknowledgeSafetyEvent(user, id);
  }

  @Patch('safety-events/:id')
  @RequireAdminPermissions(AdminPermission.SAFETY_TRIAGE)
  @ApiOperation({ summary: 'Assign, resolve or escalate a safety event (ADMIN safety:triage).' })
  patchSafety(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: PatchSafetyEventDto,
  ) {
    return this.admin.patchSafetyEvent(user, id, dto);
  }

  @Get('feedback/pending')
  @RequireAdminPermissions(AdminPermission.CONTENT_MANAGE)
  @ApiOperation({ summary: 'Feedback awaiting moderation (ADMIN content:manage).' })
  async pendingFeedback(@Query() q: PaginationQueryDto) {
    const { items, total } = await this.admin.pendingFeedback(q.skip, q.pageSize);
    return Paginated.of(items, total, q.page, q.pageSize);
  }

  @Post('feedback/:id/moderate')
  @HttpCode(200)
  @RequireAdminPermissions(AdminPermission.CONTENT_MANAGE)
  @ApiOperation({ summary: 'Approve or reject feedback (ADMIN content:manage).' })
  moderate(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseObjectIdPipe) id: string, @Body() dto: ModerateDto) {
    return this.admin.moderateFeedback(user, id, dto.decision);
  }

  @Get('policies')
  @RequireAdminPermissions(AdminPermission.SETTINGS_MANAGE)
  @ApiOperation({ summary: 'Policy documents (ADMIN settings:manage).' })
  policies() {
    return this.admin.listPolicies();
  }

  @Post('policies')
  @RequireAdminPermissions(AdminPermission.SETTINGS_MANAGE)
  @ApiOperation({ summary: 'Create a policy draft (ADMIN settings:manage). Requires legal review before publishing.' })
  createPolicy(@CurrentUser() user: AuthenticatedUser, @Body() dto: PolicyDto) {
    return this.admin.createPolicy(user, dto);
  }

  @Post('policies/:id/publish')
  @HttpCode(200)
  @RequireAdminPermissions(AdminPermission.PUBLISH_MANAGE)
  @ApiOperation({ summary: 'Publish a policy version (ADMIN publish:manage + TOTP + Quorum).' })
  publishPolicy(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: PublishDto,
    @Headers('x-totp-code') headerTotp?: string,
  ) {
    return this.admin.publishPolicy(user, id, dto.effectiveAt, headerTotp);
  }

  @Get('audit-logs')
  @RequireAdminPermissions(AdminPermission.AUDIT_READ)
  @ApiOperation({ summary: 'Search audit logs (ADMIN audit:read). Logs contain no health content.' })
  async auditLogs(@CurrentUser() user: AuthenticatedUser, @Query() q: AuditQueryDto) {
    const { items, total } = await this.audit.search({ ...q, skip: q.skip, limit: q.pageSize });
    await this.audit.record({ actorId: user.id, actorRole: user.role, action: 'admin.audit_searched', metadata: { action: q.action, resourceType: q.resourceType } });
    return Paginated.of(items, total, q.page, q.pageSize);
  }

  @Get('security')
  @RequireAdminPermissions(AdminPermission.SECURITY_MANAGE)
  @ApiOperation({ summary: 'Security signals for the last 24 hours (ADMIN security:manage).' })
  security() {
    return this.admin.securityOverview();
  }

  @Get('ai')
  @RequireAdminPermissions(AdminPermission.SETTINGS_MANAGE)
  @ApiOperation({ summary: 'AI service health, provider metrics and usage (ADMIN settings:manage).' })
  aiOverview() {
    return this.admin.aiOverview();
  }
}
