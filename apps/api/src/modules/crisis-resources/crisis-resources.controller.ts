import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminPermission, Role } from '@mindbridge/shared-types';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user.js';
import { CurrentUser, Public, RequireAdminPermissions, Roles } from '../../common/auth/decorators.js';
import { Paginated } from '../../common/interceptors/response-envelope.interceptor.js';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe.js';
import {
  AdminCrisisQueryDto,
  CreateCrisisResourceDto,
  CrisisQueryDto,
  UpdateCrisisResourceDto,
  VerifyCrisisResourceDto,
} from './crisis-resources.dto.js';
import { CrisisResourcesService } from './crisis-resources.service.js';

@ApiTags('crisis-resources')
@Controller({ path: 'crisis-resources', version: '1' })
export class CrisisResourcesController {
  constructor(private readonly crisis: CrisisResourcesService) {}

  /** Public so the crisis page works even when signed out or when a session has expired. */
  @Public()
  @Get()
  @ApiOperation({ summary: 'Verified crisis resources for a country (public).' })
  list(@Query() q: CrisisQueryDto) {
    return this.crisis.forCountry(q.country ?? 'IN', q.region);
  }
}

@ApiTags('admin')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@RequireAdminPermissions(AdminPermission.CRISIS_MANAGE)
@Controller({ path: 'admin/crisis-resources', version: '1' })
export class AdminCrisisResourcesController {
  constructor(private readonly crisis: CrisisResourcesService) {}

  @Get()
  @ApiOperation({ summary: 'All crisis resources incl. inactive and expired (ADMIN crisis:manage).' })
  async list(@Query() q: AdminCrisisQueryDto) {
    const { items, total } = await this.crisis.adminList({
      country: q.country,
      status: q.status,
      stale: q.stale === 'true',
      skip: q.skip,
      limit: q.pageSize,
    });
    return Paginated.of(items, total, q.page, q.pageSize);
  }

  @Post()
  @ApiOperation({ summary: 'Add a verified crisis resource (ADMIN crisis:manage).' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCrisisResourceDto) {
    return this.crisis.create(user, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit a resource; contact changes require re-verification (ADMIN crisis:manage).' })
  update(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseObjectIdPipe) id: string, @Body() dto: UpdateCrisisResourceDto) {
    return this.crisis.update(user, id, dto);
  }

  @Post(':id/verify')
  @HttpCode(200)
  @ApiOperation({ summary: 'Record that the details were re-checked against the official source today (ADMIN crisis:manage).' })
  verify(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseObjectIdPipe) id: string, @Body() dto: VerifyCrisisResourceDto) {
    return this.crisis.markVerified(user, id, dto.sourceUrl);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a resource (ADMIN crisis:manage).' })
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseObjectIdPipe) id: string) {
    await this.crisis.remove(user, id);
  }
}
