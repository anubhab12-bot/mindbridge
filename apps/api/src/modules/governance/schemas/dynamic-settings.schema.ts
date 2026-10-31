import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';

export type DynamicSettingsDocument = HydratedDocument<DynamicSettings>;

@Schema({ timestamps: true, collection: 'dynamic_settings' })
export class DynamicSettings {
  @Prop({
    type: Object,
    default: {
      enabled: true,
      title: '🌟 National Crisis Network Active',
      message: '24/7 Verified Crisis Lines Active: Tele-MANAS (14416) & Kiran (1800-599-0019) are free and confidential across India.',
      linkText: 'View Crisis Helplines',
      linkUrl: '/crisis-support',
      badgeType: 'info',
    },
  })
  announcementBanner!: {
    enabled: boolean;
    title: string;
    message: string;
    linkText?: string;
    linkUrl?: string;
    badgeType: 'info' | 'urgent' | 'success';
  };

  @Prop({
    type: Object,
    default: {
      enabled: true,
      totalUsers: '14,850+',
      totalNgos: '124',
      recoveryRate: '94.6%',
      avgResponseTime: '< 45s',
    },
  })
  statsOverride!: {
    enabled: boolean;
    totalUsers: string;
    totalNgos: string;
    recoveryRate: string;
    avgResponseTime: string;
  };

  @Prop({
    type: Object,
    default: {
      terms: '',
      privacy: '',
      ai: '',
      updatedAt: new Date().toISOString(),
      updatedBy: 'Super Admin',
    },
  })
  policies!: {
    terms: string;
    privacy: string;
    ai: string;
    updatedAt: string;
    updatedBy: string;
  };

  @Prop({
    type: Array,
    default: [
      { name: 'Tele-MANAS National Helpline', region: 'All India (24/7)', focus: 'Crisis Intervention & Triage' },
      { name: 'NIMHANS Community Center', region: 'Bangalore, South India', focus: 'Clinical Consultations & De-addiction' },
      { name: 'Vandrevala Foundation', region: 'Maharashtra & West India', focus: '24/7 Suicide Prevention' },
      { name: 'AASRA Emotional Support', region: 'Mumbai & Pan-India', focus: 'Crisis & Loneliness Support' },
    ],
  })
  featuredNgos!: Array<{
    name: string;
    region: string;
    focus: string;
  }>;

  @Prop({ default: false })
  maintenanceMode!: boolean;

  @Prop({ default: 12 })
  totalCouncilSeats!: number;

  @Prop({ default: 7 })
  occupiedSeats!: number;

  @Prop({
    type: Array,
    default: [
      {
        id: 'feat_exam_stress_hotline',
        type: 'HERO_PROMO_CARD',
        placement: 'HERO_SECTION',
        title: '🎓 Exam Anxiety & Academic Stress Fast-Track',
        description: 'Facing exam pressure or career burnout? Connect anonymously with peer counselors & psychologists specializing in student mental wellness.',
        ctaText: 'Access Student Support',
        ctaLink: '/crisis',
        themeColor: 'indigo',
        iconEmoji: '🎓',
        badgeLabel: 'New Student Relief',
        enabled: true,
        aiPromptOrigin: 'AI Generator: Introduce student exam anxiety program with gentle soothing guidance.',
        aiConfidenceScore: 98,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'feat_breathing_grounding_pill',
        type: 'FLOATING_CRISIS_PILL',
        placement: 'SIDE_STICKY',
        title: '🌬️ Quick 60s Grounding',
        description: 'Instant 4-7-8 nervous system reset. Tap anytime to slow your heart rate.',
        ctaText: 'Start Grounding',
        ctaLink: '/self-help',
        themeColor: 'teal',
        iconEmoji: '✨',
        badgeLabel: 'Instant Relief',
        enabled: true,
        aiPromptOrigin: 'AI Generator: Create a quick floating calming tool for users experiencing panic.',
        aiConfidenceScore: 96,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'feat_telemanas_campaign',
        type: 'COMMUNITY_CAMPAIGN',
        placement: 'FEATURED_GRID',
        title: '🇮🇳 Tele-MANAS Nationwide Coverage',
        description: 'Government of India toll-free mental health support available in 20+ regional languages round-the-clock.',
        ctaText: 'Call Toll-Free 14416',
        ctaLink: 'tel:14416',
        themeColor: 'emerald',
        iconEmoji: '📞',
        badgeLabel: 'Govt. Verified',
        enabled: true,
        aiPromptOrigin: 'AI Generator: Highlight 14416 national crisis line prominently across the site.',
        aiConfidenceScore: 99,
        createdAt: new Date().toISOString(),
      },
    ],
  })
  dynamicFeatures!: Array<any>;
}

export const DynamicSettingsSchema = SchemaFactory.createForClass(DynamicSettings);
