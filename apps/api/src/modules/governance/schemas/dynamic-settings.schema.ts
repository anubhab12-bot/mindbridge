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
}

export const DynamicSettingsSchema = SchemaFactory.createForClass(DynamicSettings);
