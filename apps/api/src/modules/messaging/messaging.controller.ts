import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Role } from '@mindbridge/shared-types';
import { Type } from 'class-transformer';
import { IsDate, IsInt, IsMongoId, IsOptional, IsString, Length, Max, Min } from 'class-validator';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user.js';
import { CurrentUser, RequireEmailVerified, Roles } from '../../common/auth/decorators.js';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe.js';
import { MessagingService } from './messaging.service.js';
import { RequireFeature } from '../feature-flags/require-feature.js';

class OpenThreadDto {
  /** For patients: the professional's profile id. For professionals: the patient's user id. */
  @IsMongoId()
  counterpartId!: string;
}

class SendDto {
  @IsString()
  @Length(1, 4000)
  content!: string;
}

class MessagesQueryDto {
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  before?: Date;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 50;
}

/** Secure messaging between a patient and a professional with an active care relationship. */
@ApiTags('messaging')
@ApiBearerAuth()
@Roles(Role.PATIENT, Role.DOCTOR)
@RequireEmailVerified()
@RequireFeature('messaging.enabled')
@Controller({ path: 'messaging/threads', version: '1' })
export class MessagingController {
  constructor(private readonly messaging: MessagingService) {}

  @Get()
  @ApiOperation({ summary: 'My message threads (PATIENT or verified DOCTOR).' })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.messaging.listThreads(user);
  }

  @Post()
  @ApiOperation({ summary: 'Open (or fetch) the thread with a care-relationship counterpart.' })
  open(@CurrentUser() user: AuthenticatedUser, @Body() dto: OpenThreadDto) {
    return this.messaging.openThread(user, dto.counterpartId);
  }

  @Get(':id/messages')
  @ApiOperation({ summary: 'Messages in a thread (participants only).' })
  messages(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseObjectIdPipe) id: string, @Query() q: MessagesQueryDto) {
    return this.messaging.listMessages(user, id, q.before, q.limit);
  }

  @Post(':id/messages')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Send a message (participants only, active care relationship).' })
  send(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseObjectIdPipe) id: string, @Body() dto: SendDto) {
    return this.messaging.send(user, id, dto.content);
  }

  @Post(':id/read')
  @HttpCode(204)
  @ApiOperation({ summary: 'Mark the thread as read (participants only).' })
  async read(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseObjectIdPipe) id: string) {
    await this.messaging.markRead(user, id);
  }
}
