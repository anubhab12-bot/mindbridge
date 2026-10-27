import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Role } from '@mindbridge/shared-types';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user.js';
import { CurrentUser, RequireVerifiedDoctor, Roles } from '../../common/auth/decorators.js';
import { PaginationQueryDto } from '../../common/dto/pagination.dto.js';
import { Paginated } from '../../common/interceptors/response-envelope.interceptor.js';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe.js';
import { AddendumDto, AiAssistDto, CreateNoteDto, UpdateNoteDto } from './clinical.dto.js';
import { ClinicalService } from './clinical.service.js';
import { RequireFeature } from '../feature-flags/require-feature.js';

/**
 * Professional-only. Requires an APPROVED professional; patient routes additionally require an
 * active care relationship (404 otherwise) and the patient's consent for shared data.
 */
@ApiTags('doctor-clinical')
@ApiBearerAuth()
@Roles(Role.DOCTOR)
@RequireVerifiedDoctor()
@Controller({ path: 'doctors/me', version: '1' })
export class ClinicalController {
  constructor(private readonly clinical: ClinicalService) {}

  @Get('patients')
  @ApiOperation({ summary: 'Patients with an active care relationship (verified DOCTOR).' })
  patients(@CurrentUser() user: AuthenticatedUser) {
    return this.clinical.listPatients(user);
  }

  @Get('patients/:patientId')
  @ApiOperation({ summary: 'Minimum-necessary patient overview (verified DOCTOR, care relationship).' })
  overview(@CurrentUser() user: AuthenticatedUser, @Param('patientId', ParseObjectIdPipe) patientId: string) {
    return this.clinical.patientOverview(user, patientId);
  }

  @Get('patients/:patientId/mood-summary')
  @ApiOperation({ summary: '30-day mood aggregates (care relationship + SHARE_MOOD_SUMMARY consent).' })
  mood(@CurrentUser() user: AuthenticatedUser, @Param('patientId', ParseObjectIdPipe) patientId: string) {
    return this.clinical.moodSummary(user, patientId);
  }

  @Get('patients/:patientId/ai-summary')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'AI summary of recent companion conversations (care relationship + SHARE_AI_SUMMARY consent).' })
  aiSummary(@CurrentUser() user: AuthenticatedUser, @Param('patientId', ParseObjectIdPipe) patientId: string) {
    return this.clinical.aiSummary(user, patientId);
  }

  @Get('patients/:patientId/intakes')
  @ApiOperation({ summary: 'Pre-consultation intakes (care relationship + SHARE_INTAKE consent).' })
  intakes(@CurrentUser() user: AuthenticatedUser, @Param('patientId', ParseObjectIdPipe) patientId: string) {
    return this.clinical.sharedIntakes(user, patientId);
  }

  @Get('patients/:patientId/notes')
  @ApiOperation({ summary: 'My notes for this patient (verified DOCTOR, care relationship).' })
  async listNotes(@CurrentUser() user: AuthenticatedUser, @Param('patientId', ParseObjectIdPipe) patientId: string, @Query() q: PaginationQueryDto) {
    const { items, total } = await this.clinical.listNotes(user, patientId, q.skip, q.pageSize);
    return Paginated.of(items, total, q.page, q.pageSize);
  }

  @Post('patients/:patientId/notes')
  @ApiOperation({ summary: 'Create a draft note (verified DOCTOR, care relationship).' })
  createNote(@CurrentUser() user: AuthenticatedUser, @Param('patientId', ParseObjectIdPipe) patientId: string, @Body() dto: CreateNoteDto) {
    return this.clinical.createNote(user, patientId, dto);
  }

  @Get('notes/:id')
  @ApiOperation({ summary: 'Read one of my notes (author only).' })
  getNote(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseObjectIdPipe) id: string) {
    return this.clinical.getNote(user, id);
  }

  @Patch('notes/:id')
  @ApiOperation({ summary: 'Edit a draft note (author only; final notes are immutable).' })
  updateNote(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseObjectIdPipe) id: string, @Body() dto: UpdateNoteDto) {
    return this.clinical.updateNote(user, id, dto);
  }

  @Post('notes/:id/finalize')
  @HttpCode(200)
  @ApiOperation({ summary: 'Approve and finalize a note (author only). AI-drafted text becomes part of the record only here.' })
  finalize(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseObjectIdPipe) id: string) {
    return this.clinical.finalizeNote(user, id);
  }

  @Post('notes/:id/addenda')
  @ApiOperation({ summary: 'Append a correction to a final note (author only).' })
  addendum(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseObjectIdPipe) id: string, @Body() dto: AddendumDto) {
    return this.clinical.addAddendum(user, id, dto.content);
  }

  @Delete('notes/:id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a draft note (author only).' })
  async deleteNote(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseObjectIdPipe) id: string) {
    await this.clinical.deleteDraft(user, id);
  }

  @Post('ai-assist')
  @RequireFeature('ai.doctor_assist')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Generate an AI draft for professional review (verified DOCTOR; patient context needs DOCTOR_AI_ASSIST consent).' })
  aiAssist(@CurrentUser() user: AuthenticatedUser, @Body() dto: AiAssistDto) {
    return this.clinical.aiAssist(user, dto);
  }
}
