import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Role } from '@mindbridge/shared-types';
import { IsIn, IsMongoId, IsOptional, IsString, Length, MaxLength } from 'class-validator';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user.js';
import { CurrentUser, RequireEmailVerified, Roles } from '../../common/auth/decorators.js';
import { PaginationQueryDto } from '../../common/dto/pagination.dto.js';
import { Paginated } from '../../common/interceptors/response-envelope.interceptor.js';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe.js';
import { AiChatService } from './ai-chat.service.js';

class CreateConversationDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  title?: string;
}

class RenameConversationDto {
  @IsString()
  @Length(1, 80)
  title!: string;
}

class SendMessageDto {
  @IsString()
  @Length(1, 4000)
  content!: string;
}

class FeedbackDto {
  @IsIn(['HELPFUL', 'NOT_HELPFUL', 'REPORTED'])
  feedback!: 'HELPFUL' | 'NOT_HELPFUL' | 'REPORTED';
}

class HumanSupportDto {
  @IsOptional()
  @IsMongoId()
  conversationId?: string;
}

/**
 * Patient AI companion. PATIENT role, verified email, AI_PROCESSING consent (checked in the
 * service). Every lookup is scoped to the caller's own id.
 */
@ApiTags('ai-companion')
@ApiBearerAuth()
@Roles(Role.PATIENT)
@RequireEmailVerified()
@Controller({ path: 'ai', version: '1' })
export class AiChatController {
  constructor(private readonly chat: AiChatService) {}

  @Post('conversations')
  @ApiOperation({ summary: 'Start a conversation (PATIENT, AI consent required).' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateConversationDto) {
    return this.chat.createConversation(user.id, dto.title);
  }

  @Get('conversations')
  @ApiOperation({ summary: 'List my conversations (PATIENT, own data).' })
  async list(@CurrentUser() user: AuthenticatedUser, @Query() q: PaginationQueryDto) {
    const { items, total } = await this.chat.listConversations(user.id, q.skip, q.pageSize);
    return Paginated.of(items, total, q.page, q.pageSize);
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Messages in one of my conversations (PATIENT, ownership enforced).' })
  async messages(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseObjectIdPipe) id: string, @Query() q: PaginationQueryDto) {
    const { items, total } = await this.chat.getMessages(user.id, id, q.skip, q.pageSize);
    return Paginated.of(items, total, q.page, q.pageSize);
  }

  @Post('conversations/:id/messages')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Send a message and get the companion reply with safety information (PATIENT).' })
  send(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseObjectIdPipe) id: string, @Body() dto: SendMessageDto) {
    return this.chat.send(user.id, id, dto.content);
  }

  @Patch('conversations/:id')
  @ApiOperation({ summary: 'Rename a conversation (PATIENT, ownership enforced).' })
  rename(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseObjectIdPipe) id: string, @Body() dto: RenameConversationDto) {
    return this.chat.renameConversation(user.id, id, dto.title);
  }

  @Delete('conversations/:id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Permanently delete a conversation (PATIENT, ownership enforced).' })
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseObjectIdPipe) id: string) {
    await this.chat.deleteConversation(user.id, id);
  }

  @Post('conversations/:id/summary')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Generate a private summary of this conversation (PATIENT).' })
  summarize(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseObjectIdPipe) id: string) {
    return this.chat.summarize(user.id, id);
  }

  @Post('messages/:id/feedback')
  @HttpCode(204)
  @ApiOperation({ summary: 'Rate or report a companion reply (PATIENT, own messages).' })
  async feedback(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseObjectIdPipe) id: string, @Body() dto: FeedbackDto) {
    await this.chat.setFeedback(user.id, id, dto.feedback);
  }

  @Post('human-support')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Ask for human support: shows crisis resources and notifies my care team (PATIENT).' })
  humanSupport(@CurrentUser() user: AuthenticatedUser, @Body() dto: HumanSupportDto) {
    return this.chat.requestHumanSupport(user.id, dto.conversationId);
  }
}
