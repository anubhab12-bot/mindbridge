import { Body, Controller, Get, NotFoundException, Param, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminPermission, Role } from '@mindbridge/shared-types';
import { IsBoolean } from 'class-validator';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user.js';
import { CurrentUser, Public, RequireAdminPermissions, Roles } from '../../common/auth/decorators.js';
import { FeatureFlagsService } from './feature-flags.service.js';

class SetFlagDto {
  @IsBoolean() enabled!: boolean;
}

@ApiTags('settings')
@Controller({ path: 'feature-flags', version: '1' })
export class FeatureFlagsController {
  constructor(private readonly flags: FeatureFlagsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'UI feature toggles (public, non-sensitive).' })
  list() {
    return this.flags.clientFlags();
  }
}

@ApiTags('admin')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@RequireAdminPermissions(AdminPermission.SETTINGS_MANAGE)
@Controller({ path: 'admin/feature-flags', version: '1' })
export class AdminFeatureFlagsController {
  constructor(private readonly flags: FeatureFlagsService) {}

  @Get()
  @ApiOperation({ summary: 'All flags (ADMIN settings:manage).' })
  list() {
    return this.flags.list();
  }

  @Put(':key')
  @ApiOperation({ summary: 'Turn a known flag on or off (ADMIN settings:manage).' })
  async set(@CurrentUser() user: AuthenticatedUser, @Param('key') key: string, @Body() dto: SetFlagDto) {
    const res = await this.flags.set(user, key, dto.enabled);
    if (!res) throw new NotFoundException({ code: 'UNKNOWN_FLAG', message: 'Unknown flag.' });
    return res;
  }
}
