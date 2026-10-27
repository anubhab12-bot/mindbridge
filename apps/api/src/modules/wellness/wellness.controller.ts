import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminPermission, ContentStatus, Role, WellnessContentType } from '@mindbridge/shared-types';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsOptional, IsString, IsUrl, Length, Matches, Max, MaxLength, Min } from 'class-validator';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user.js';
import { CurrentUser, Public, RequireAdminPermissions, Roles } from '../../common/auth/decorators.js';
import { PaginationQueryDto } from '../../common/dto/pagination.dto.js';
import { Paginated } from '../../common/interceptors/response-envelope.interceptor.js';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe.js';
import { WellnessService } from './wellness.service.js';

class WellnessQueryDto extends PaginationQueryDto {
  @IsOptional() @IsIn(Object.values(WellnessContentType)) type?: WellnessContentType;
  @IsOptional() @IsString() @MaxLength(10) language?: string;
  @IsOptional() @IsString() @MaxLength(40) tag?: string;
}

class WellnessDto {
  @Matches(/^[a-z0-9-]{3,120}$/) slug!: string;
  @IsIn(Object.values(WellnessContentType)) type!: WellnessContentType;
  @IsString() @Length(3, 200) title!: string;
  @IsString() @Length(10, 500) summary!: string;
  @IsString() @Length(10, 50000) body!: string;
  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) @MaxLength(500, { each: true }) steps?: string[];
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(120) durationMinutes?: number;
  @IsOptional() @IsString() @MaxLength(10) language?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(10) @IsString({ each: true }) @MaxLength(40, { each: true }) tags?: string[];
  @IsOptional() @IsString() @MaxLength(200) publisher?: string;
  @IsOptional() @IsUrl({ protocols: ['https'], require_protocol: true }) sourceUrl?: string;
}

class UpdateWellnessDto {
  @IsOptional() @IsString() @Length(3, 200) title?: string;
  @IsOptional() @IsString() @Length(10, 500) summary?: string;
  @IsOptional() @IsString() @Length(10, 50000) body?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) steps?: string[];
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(120) durationMinutes?: number;
  @IsOptional() @IsArray() @ArrayMaxSize(10) @IsString({ each: true }) tags?: string[];
  @IsOptional() @IsString() @MaxLength(200) publisher?: string;
  @IsOptional() @IsUrl({ protocols: ['https'], require_protocol: true }) sourceUrl?: string;
}

class StatusDto {
  @IsIn(Object.values(ContentStatus)) status!: ContentStatus;
}

class AdminWellnessQuery extends PaginationQueryDto {
  @IsOptional() @IsIn(Object.values(ContentStatus)) status?: ContentStatus;
}

@ApiTags('wellness')
@Public()
@Controller({ path: 'wellness', version: '1' })
export class WellnessController {
  constructor(private readonly wellness: WellnessService) {}

  @Get()
  @ApiOperation({ summary: 'Published self-help content (public).' })
  async list(@Query() q: WellnessQueryDto) {
    const { items, total } = await this.wellness.listPublished({ ...q, skip: q.skip, limit: q.pageSize });
    return Paginated.of(items, total, q.page, q.pageSize);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'One published item (public).' })
  get(@Param('slug') slug: string) {
    return this.wellness.getPublished(slug);
  }
}

@ApiTags('admin')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@RequireAdminPermissions(AdminPermission.CONTENT_MANAGE)
@Controller({ path: 'admin/wellness', version: '1' })
export class AdminWellnessController {
  constructor(private readonly wellness: WellnessService) {}

  @Get()
  @ApiOperation({ summary: 'All content incl. drafts (ADMIN content:manage).' })
  async list(@Query() q: AdminWellnessQuery) {
    const { items, total } = await this.wellness.adminList(q.status, q.skip, q.pageSize);
    return Paginated.of(items, total, q.page, q.pageSize);
  }

  @Post()
  @ApiOperation({ summary: 'Create draft content (ADMIN content:manage).' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: WellnessDto) {
    return this.wellness.create(user, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit content; published items return to draft for re-review (ADMIN content:manage).' })
  update(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseObjectIdPipe) id: string, @Body() dto: UpdateWellnessDto) {
    return this.wellness.update(user, id, dto);
  }

  @Post(':id/status')
  @HttpCode(200)
  @ApiOperation({ summary: 'Review and publish, unpublish or archive (ADMIN content:manage).' })
  status(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseObjectIdPipe) id: string, @Body() dto: StatusDto) {
    return this.wellness.setStatus(user, id, dto.status);
  }

  @Post('sync-knowledge')
  @HttpCode(200)
  @ApiOperation({ summary: 'Re-sync published content to the AI knowledge base (ADMIN content:manage).' })
  async sync() {
    return { chunks: await this.wellness.syncKnowledge() };
  }
}
