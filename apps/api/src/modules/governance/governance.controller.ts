import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { GovernanceService } from './governance.service.js';
import { Public } from '../../common/auth/decorators.js';
import type {
  CouncilApplicationCredentials,
  CouncilTaskProof,
  DynamicFeatureItem,
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

  // ------------------------------------------------------------- AI Feature Maker & Planner
  @Public()
  @Post('features/ai-plan')
  @ApiOperation({ summary: 'Generate a structured dynamic feature proposal from Super Admin natural language command' })
  async planFeatureWithAi(@Body() dto: { prompt: string }) {
    return { data: this.governance.planFeatureWithAi(dto.prompt) };
  }

  @Public()
  @Post('features/publish')
  @ApiOperation({ summary: 'Publish or update a dynamic feature to the live Main Site' })
  async publishDynamicFeature(@Body() dto: DynamicFeatureItem) {
    return { data: await this.governance.publishDynamicFeature(dto) };
  }

  @Public()
  @Patch('features/:id/toggle')
  @ApiOperation({ summary: 'Toggle visibility of a dynamic feature on the live Main Site' })
  async toggleDynamicFeature(
    @Param('id') id: string,
    @Body() dto: { enabled?: boolean },
  ) {
    return { data: await this.governance.toggleDynamicFeature(id, dto.enabled) };
  }

  @Public()
  @Delete('features/:id')
  @ApiOperation({ summary: 'Remove a dynamic feature from the live Main Site' })
  async deleteDynamicFeature(@Param('id') id: string) {
    return { data: await this.governance.deleteDynamicFeature(id) };
  }
}
