import { CrisisServiceType } from '@mindbridge/shared-types';

/**
 * Seed entries, verified against official Government of India sources on 2026-10-27.
 * They are loaded into the admin-editable registry by `seed-crisis-resources` and must be
 * re-verified by an administrator before production launch and at least every
 * CRISIS_RESOURCE_MAX_AGE_DAYS. Do not add numbers here without an official source URL.
 */
export const VERIFIED_SEED_RESOURCES = [
  {
    name: 'Emergency Response Support System (112)',
    country: 'IN',
    serviceType: CrisisServiceType.EMERGENCY,
    phone: '112',
    altPhones: [],
    url: 'https://112.gov.in/',
    languages: [],
    availability: '24x7',
    description: 'Single emergency number for police, fire and ambulance across India.',
    sourceUrl: 'https://112.gov.in/about',
    verifiedAt: new Date('2026-10-27T00:00:00Z'),
    priority: 10,
  },
  {
    name: 'Tele-MANAS (National Tele Mental Health Programme)',
    country: 'IN',
    serviceType: CrisisServiceType.MENTAL_HEALTH_HELPLINE,
    phone: '14416',
    altPhones: ['1-800-891-4416'],
    url: 'https://telemanas.mohfw.gov.in/',
    languages: ['20 Indian languages (per Ministry of Health and Family Welfare)'],
    availability: '24x7, toll-free',
    description: 'Free government mental health support and counselling by phone, run by the Ministry of Health and Family Welfare.',
    sourceUrl: 'https://www.pib.gov.in/PressReleseDetailm.aspx?PRID=2226319&reg=3&lang=2',
    verifiedAt: new Date('2026-10-27T00:00:00Z'),
    priority: 20,
  },
] as const;

export const CRISIS_FALLBACK_ADVICE =
  'If you might act on thoughts of harming yourself, or someone is in immediate danger, call your local emergency number ' +
  'or go to the nearest hospital emergency department now. If you can, stay with someone you trust.';
