import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AdminPermission, Role, SupportTicketCategory, SupportTicketStatus } from '@mindbridge/shared-types';
import { IsIn, IsOptional, IsString, Length } from 'class-validator';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user.js';
import { CurrentUser, RequireAdminPermissions, Roles } from '../../common/auth/decorators.js';
import { PaginationQueryDto } from '../../common/dto/pagination.dto.js';
import { Paginated } from '../../common/interceptors/response-envelope.interceptor.js';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe.js';
import { SupportService } from './support.service.js';

class CreateTicketDto {
  @IsIn(Object.values(SupportTicketCategory)) category!: SupportTicketCategory;
  @IsString() @Length(3, 140) subject!: string;
  @IsString() @Length(1, 5000) message!: string;
}

class ReplyDto {
  @IsString() @Length(1, 5000) message!: string;
}

class AdminReplyDto extends ReplyDto {
  @IsOptional() @IsIn(Object.values(SupportTicketStatus)) status?: SupportTicketStatus;
}

class StatusDto {
  @IsIn(Object.values(SupportTicketStatus)) status!: SupportTicketStatus;
}

class AdminTicketQuery extends PaginationQueryDto {
  @IsOptional() @IsIn(Object.values(SupportTicketStatus)) status?: SupportTicketStatus;
  @IsOptional() @IsIn(Object.values(SupportTicketCategory)) category?: SupportTicketCategory;
}

@ApiTags('support')
@ApiBearerAuth()
@Roles(Role.PATIENT, Role.DOCTOR)
@Controller({ path: 'support/tickets', version: '1' })
export class SupportController {
  constructor(private readonly support: SupportService) {}

  @Post()
  @Throttle({ default: { limit: 5, ttl: 3_600_000 } })
  @ApiOperation({ summary: 'Open a support request (PATIENT/DOCTOR).' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateTicketDto) {
    return this.support.create(user, dto);
  }

  @Get()
  @ApiOperation({ summary: 'My support requests.' })
  async list(@CurrentUser() user: AuthenticatedUser, @Query() q: PaginationQueryDto) {
    const { items, total } = await this.support.listOwn(user, q.skip, q.pageSize);
    return Paginated.of(items, total, q.page, q.pageSize);
  }

  @Get(':id')
  @ApiOperation({ summary: 'One of my support requests (owner only).' })
  get(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseObjectIdPipe) id: string) {
    return this.support.getOwn(user, id);
  }

  @Post(':id/replies')
  @ApiOperation({ summary: 'Reply to my support request (owner only).' })
  reply(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseObjectIdPipe) id: string, @Body() dto: ReplyDto) {
    return this.support.replyOwn(user, id, dto.message);
  }
}

@ApiTags('admin')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@RequireAdminPermissions(AdminPermission.SUPPORT_MANAGE)
@Controller({ path: 'admin/support-tickets', version: '1' })
export class AdminSupportController {
  constructor(private readonly support: SupportService) {}

  @Get()
  @ApiOperation({ summary: 'Support queue (ADMIN support:manage).' })
  async list(@Query() q: AdminTicketQuery) {
    const { items, total } = await this.support.adminList({ status: q.status, category: q.category, skip: q.skip, limit: q.pageSize });
    return Paginated.of(items, total, q.page, q.pageSize);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Read a ticket (ADMIN support:manage, audited).' })
  get(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseObjectIdPipe) id: string) {
    return this.support.adminGet(user, id);
  }

  @Post(':id/replies')
  @ApiOperation({ summary: 'Reply to a ticket (ADMIN support:manage).' })
  reply(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseObjectIdPipe) id: string, @Body() dto: AdminReplyDto) {
    return this.support.adminReply(user, id, dto.message, dto.status);
  }

  @Post(':id/status')
  @HttpCode(200)
  @ApiOperation({ summary: 'Change ticket status (ADMIN support:manage).' })
  status(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseObjectIdPipe) id: string, @Body() dto: StatusDto) {
    return this.support.adminSetStatus(user, id, dto.status);
  }
}
