import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { GovernanceService } from './governance.service.js';
import { Public } from '../../common/auth/decorators.js';
import type {
  CouncilApplicationCredentials,
  CouncilTaskProof,
  DynamicSiteSettings,
} from '@mindbridge/shared-types';

@ApiTags('governance')
@Controller({ path: 'governance', version: '1' })
export class GovernanceController {
  constructor(private readonly governance: GovernanceService) {}

  @Public()
  @Get('settings')
  @ApiOperation({ summary: 'Get dynamic site settings that reflect across the MindBridge platform' })
  async getSettings() {
    return { data: await this.governance.getSettings() };
  }

  @Public()
  @Put('settings')
  @ApiOperation({ summary: 'Update dynamic site settings (Super Admin controlled)' })
  async updateSettings(@Body() dto: Partial<DynamicSiteSettings>) {
    return { data: await this.governance.updateSettings(dto) };
  }

  @Public()
  @Post('apply')
  @ApiOperation({ summary: 'Submit an application for one of the 12 Council Admin seats (Specialist, NGO, Influencer)' })
  async applyForCouncil(
    @Body()
    dto: {
      fullName: string;
      email: string;
      phone?: string;
      category: 'SPECIALIST' | 'NGO' | 'INFLUENCER';
      credentials: CouncilApplicationCredentials;
    },
  ) {
    return { data: await this.governance.applyForCouncil(dto) };
  }

  @Public()
  @Get('applications')
  @ApiOperation({ summary: 'List Council applications with AI safety screening results' })
  async listApplications(
    @Query('category') category?: string,
    @Query('status') status?: string,
  ) {
    return { data: await this.governance.listApplications(category, status) };
  }

  @Public()
  @Post('applications/:id/decision')
  @ApiOperation({ summary: 'Super Admin decision on Council application (Approve/Reject)' })
  async reviewApplication(
    @Param('id') id: string,
    @Body() dto: { decision: 'APPROVED' | 'REJECTED'; notes?: string; reviewer?: string },
  ) {
    return { data: await this.governance.reviewApplication(id, dto.decision, dto.notes, dto.reviewer) };
  }

  @Public()
  @Get('tasks')
  @ApiOperation({ summary: 'List distributed tasks for Specialists, NGOs, and Influencers' })
  async listTasks(
    @Query('category') category?: string,
    @Query('status') status?: string,
  ) {
    return { data: await this.governance.listTasks(category, status) };
  }

  @Public()
  @Post('tasks/generate-ai')
  @ApiOperation({ summary: 'Use AI to generate awareness missions and social reel tasks for Influencers' })
  async generateAiTasks() {
    return { data: await this.governance.generateAiTasks() };
  }

  @Public()
  @Post('tasks/:id/submit-proof')
  @ApiOperation({ summary: 'Influencer submits awareness reel/post proof link and reach stats' })
  async submitProof(
    @Param('id') id: string,
    @Body() dto: { proof: CouncilTaskProof },
  ) {
    return { data: await this.governance.submitProof(id, dto.proof) };
  }

  @Public()
  @Post('tasks/:id/verify-proof')
  @ApiOperation({ summary: 'Super Admin verifies or requests revision on submitted awareness proof' })
  async verifyProof(
    @Param('id') id: string,
    @Body() dto: { decision: 'VERIFIED' | 'REVISION_REQUESTED' },
  ) {
    return { data: await this.governance.verifyProof(id, dto.decision) };
  }

  @Public()
  @Get('stats')
  @ApiOperation({ summary: 'Council governance capacity (12 spots) and live population health metrics' })
  async getStats() {
    return { data: await this.governance.getCouncilStats() };
  }
}
