import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@mindbridge/shared-types';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user.js';
import { CurrentUser, Roles } from '../../common/auth/decorators.js';
import { PaginationQueryDto } from '../../common/dto/pagination.dto.js';
import { Paginated } from '../../common/interceptors/response-envelope.interceptor.js';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe.js';
import { MoodService } from './mood.service.js';
import { EMOTION_TAGS, type EmotionTag } from './schemas/mood-entry.schema.js';

class CreateMoodDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  score!: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @IsIn(EMOTION_TAGS, { each: true })
  emotions?: EmotionTag[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

class MoodQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to?: string;
}

class TrendQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(7)
  @Max(365)
  days = 30;
}

/** All routes: PATIENT role, and every query is filtered by the caller's own id. */
@ApiTags('mood')
@ApiBearerAuth()
@Roles(Role.PATIENT)
@Controller({ path: 'patients/mood-entries', version: '1' })
export class MoodController {
  constructor(private readonly mood: MoodService) {}

  @Post()
  @ApiOperation({ summary: 'Add a mood check-in (PATIENT, own data).' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateMoodDto) {
    return this.mood.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List my mood check-ins (PATIENT, own data).' })
  async list(@CurrentUser() user: AuthenticatedUser, @Query() q: MoodQueryDto) {
    const { items, total } = await this.mood.list(user.id, { from: q.from, to: q.to, skip: q.skip, limit: q.pageSize });
    return Paginated.of(items, total, q.page, q.pageSize);
  }

  @Get('trend')
  @ApiOperation({ summary: 'Daily averages for my mood chart (PATIENT, own data).' })
  trend(@CurrentUser() user: AuthenticatedUser, @Query() q: TrendQueryDto) {
    return this.mood.trend(user.id, q.days);
  }

  @Get('today')
  @ApiOperation({ summary: "Today's latest check-in, if any (PATIENT, own data)." })
  today(@CurrentUser() user: AuthenticatedUser) {
    return this.mood.today(user.id);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete one of my check-ins (PATIENT, ownership enforced).' })
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseObjectIdPipe) id: string) {
    await this.mood.remove(user.id, id);
  }
}
