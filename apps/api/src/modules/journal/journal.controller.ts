import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@mindbridge/shared-types';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user.js';
import { CurrentUser, Roles } from '../../common/auth/decorators.js';
import { PaginationQueryDto } from '../../common/dto/pagination.dto.js';
import { Paginated } from '../../common/interceptors/response-envelope.interceptor.js';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe.js';
import { JournalService, REFLECTION_PROMPTS } from './journal.service.js';

class CreateJournalDto {
  @IsOptional()
  @IsString()
  @MaxLength(140)
  title?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(20000)
  body!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  prompt?: string;
}

class UpdateJournalDto {
  @IsOptional()
  @IsString()
  @MaxLength(140)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(20000)
  body?: string;
}

/** PATIENT only; every operation is scoped to the caller. Journals are never shared. */
@ApiTags('journal')
@ApiBearerAuth()
@Roles(Role.PATIENT)
@Controller({ path: 'patients/journal-entries', version: '1' })
export class JournalController {
  constructor(private readonly journal: JournalService) {}

  @Get('prompts')
  @ApiOperation({ summary: 'Optional reflection prompts (PATIENT).' })
  prompts() {
    return REFLECTION_PROMPTS;
  }

  @Post()
  @ApiOperation({ summary: 'Write a private journal entry (PATIENT, own data, encrypted at rest).' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateJournalDto) {
    return this.journal.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List my journal entries with previews (PATIENT, own data).' })
  async list(@CurrentUser() user: AuthenticatedUser, @Query() q: PaginationQueryDto) {
    const { items, total } = await this.journal.list(user.id, q.skip, q.pageSize);
    return Paginated.of(items, total, q.page, q.pageSize);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Read one of my entries (PATIENT, ownership enforced).' })
  get(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseObjectIdPipe) id: string) {
    return this.journal.get(user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit one of my entries (PATIENT, ownership enforced).' })
  update(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseObjectIdPipe) id: string, @Body() dto: UpdateJournalDto) {
    return this.journal.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete one of my entries (PATIENT, ownership enforced).' })
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseObjectIdPipe) id: string) {
    await this.journal.remove(user.id, id);
  }
}
