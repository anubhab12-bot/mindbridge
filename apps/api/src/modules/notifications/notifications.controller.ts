import { Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@mindbridge/shared-types';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user.js';
import { CurrentUser, Roles } from '../../common/auth/decorators.js';
import { PaginationQueryDto } from '../../common/dto/pagination.dto.js';
import { Paginated } from '../../common/interceptors/response-envelope.interceptor.js';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe.js';
import { NotificationsService } from './notifications.service.js';

class NotificationQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  unreadOnly?: boolean;
}

@ApiTags('notifications')
@ApiBearerAuth()
@Roles(Role.PATIENT, Role.DOCTOR, Role.ADMIN)
@Controller({ path: 'notifications', version: '1' })
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'My notifications (owner only).' })
  async list(@CurrentUser() user: AuthenticatedUser, @Query() q: NotificationQueryDto) {
    const { items, total } = await this.notifications.list(user.id, q.skip, q.pageSize, q.unreadOnly);
    return Paginated.of(items, total, q.page, q.pageSize);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Number of unread notifications.' })
  async unread(@CurrentUser() user: AuthenticatedUser) {
    const { unread } = await this.notifications.list(user.id, 0, 1);
    return { unread };
  }

  @Post(':id/read')
  @HttpCode(204)
  @ApiOperation({ summary: 'Mark one of my notifications read.' })
  async read(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseObjectIdPipe) id: string) {
    await this.notifications.markRead(user.id, id);
  }

  @Post('read-all')
  @HttpCode(204)
  @ApiOperation({ summary: 'Mark all my notifications read.' })
  async readAll(@CurrentUser() user: AuthenticatedUser) {
    await this.notifications.markAllRead(user.id);
  }
}
