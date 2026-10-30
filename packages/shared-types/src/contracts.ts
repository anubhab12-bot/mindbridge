import type {
  AccountStatus,
  AdminPermission,
  AppointmentStatus,
  ConsultationMode,
  CrisisServiceType,
  DoctorVerificationStatus,
  ProfessionalCategory,
  RiskLevel,
  Role,
} from './enums.js';

/** Every successful API response is wrapped as `{ data, meta? }`. */
export interface ApiResponse<T> {
  data: T;
  meta?: PageMeta;
}

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** Every error response uses this shape. `details` never contains sensitive data. */
export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  requestId?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  status: AccountStatus;
  emailVerified: boolean;
  mfaEnabled: boolean;
  doctorVerificationStatus?: DoctorVerificationStatus;
  adminPermissions?: AdminPermission[];
  timezone: string;
}

export interface AuthTokenResponse {
  accessToken: string;
  expiresIn: number;
  user: AuthUser;
}

export interface MfaChallengeResponse {
  mfaRequired: true;
  mfaToken: string;
}

export interface DoctorPublicProfile {
  id: string;
  displayName: string;
  professionalCategory: ProfessionalCategory;
  qualifications: string[];
  specialties: string[];
  languages: string[];
  yearsExperience: number;
  bio: string;
  consultationFee: { amount: number; currency: string };
  consultationModes: ConsultationMode[];
  slotDurationMinutes: number;
  timezone: string;
  verified: boolean;
  ratingAverage: number | null;
  ratingCount: number;
}

export interface TimeSlot {
  startAt: string;
  endAt: string;
}

export interface AppointmentSummary {
  id: string;
  status: AppointmentStatus;
  startAt: string;
  endAt: string;
  mode: ConsultationMode;
  doctor: { id: string; displayName: string; professionalCategory: ProfessionalCategory };
  patient?: { id: string; displayName: string };
  reasonForVisit?: string;
  canCancel: boolean;
  canReschedule: boolean;
}

export interface CrisisResourceView {
  id: string;
  name: string;
  country: string;
  region?: string;
  serviceType: CrisisServiceType;
  phone?: string;
  sms?: string;
  url?: string;
  languages: string[];
  availability: string;
  description?: string;
  sourceUrl: string;
  verifiedAt: string;
}

export interface CrisisResourcesResponse {
  country: string;
  resources: CrisisResourceView[];
  /** Always present: shown when no verified local resource exists, and as a general reminder. */
  fallbackAdvice: string;
}

export interface SafetyInfo {
  riskLevel: RiskLevel;
  crisisMode: boolean;
  /** Short, non-diagnostic reason codes, e.g. "self_harm_intent". Never contains message text. */
  signals: string[];
  resources?: CrisisResourcesResponse;
  showHumanSupport: boolean;
}

export interface AiChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'notice';
  content: string;
  createdAt: string;
  safety?: SafetyInfo;
  /** True when the reply came from the development mock provider rather than a real model. */
  isMock?: boolean;
}

export interface CouncilApplicationCredentials {
  licenseNumber?: string;
  yearsExperience?: number;
  specialization?: string;
  hospitalAffiliation?: string;
  organizationName?: string;
  ngoRegistrationNumber?: string;
  operatingRegions?: string[];
  socialHandle?: string;
  platform?: string;
  followersCount?: number;
  portfolioUrl?: string;
  sampleContent?: string;
}

export interface CouncilAiSafetyAssessment {
  isSafe: boolean;
  safetyScore: number; // 0 - 100%
  riskCategory: 'CLEAN_BRAND_SAFE' | 'POTENTIAL_CONCERN' | 'VULGARITY_OR_ADULT_CONTENT' | 'REJECTED_UNSAFE';
  flaggedReasons: string[];
  summary: string;
  recommendation: 'RECOMMEND_APPROVAL' | 'MANUAL_REVIEW_REQUIRED' | 'AUTOMATIC_REJECTION';
}

export interface CouncilApplication {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  category: 'SPECIALIST' | 'NGO' | 'INFLUENCER';
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'AI_SAFETY_FLAGGED';
  credentials: CouncilApplicationCredentials;
  aiSafety: CouncilAiSafetyAssessment;
  decisionNotes?: string;
  seatNumber?: number; // 1 to 12
  createdAt: string;
  updatedAt: string;
}

export interface CouncilTaskProof {
  url?: string;
  screenshotUrl?: string;
  notes?: string;
  impressions?: number;
  submittedAt?: string;
}

export interface CouncilTask {
  id: string;
  targetCategory: 'SPECIALIST' | 'NGO' | 'INFLUENCER';
  assigneeId?: string;
  assigneeName?: string;
  title: string;
  description: string;
  deliverableFormat: string;
  status: 'ASSIGNED' | 'PROOF_SUBMITTED' | 'VERIFIED' | 'REVISION_REQUESTED';
  proof?: CouncilTaskProof;
  aiGenerated: boolean;
  dueDate?: string;
  createdAt: string;
}

export interface DynamicSiteSettings {
  announcementBanner: {
    enabled: boolean;
    title: string;
    message: string;
    linkText?: string;
    linkUrl?: string;
    badgeType: 'info' | 'urgent' | 'success';
  };
  statsOverride: {
    enabled: boolean;
    totalUsers: string;
    totalNgos: string;
    recoveryRate: string;
    avgResponseTime: string;
  };
  featuredNgos: {
    name: string;
    region: string;
    focus: string;
  }[];
  maintenanceMode: boolean;
  totalCouncilSeats: number;
  occupiedSeats: number;
  dynamicFeatures?: DynamicFeatureItem[];
  updatedAt: string;
}

export interface DynamicFeatureItem {
  id: string;
  type: 'ANNOUNCEMENT_BANNER' | 'HERO_PROMO_CARD' | 'FLOATING_CRISIS_PILL' | 'INTERACTIVE_WIDGET' | 'COMMUNITY_CAMPAIGN';
  placement: 'TOP_HEADER' | 'HERO_SECTION' | 'SIDE_STICKY' | 'FEATURED_GRID' | 'BOTTOM_CTA';
  title: string;
  description: string;
  ctaText: string;
  ctaLink: string;
  themeColor: 'emerald' | 'indigo' | 'rose' | 'amber' | 'purple' | 'teal' | 'blue';
  iconEmoji: string;
  badgeLabel?: string;
  enabled: boolean;
  aiPromptOrigin?: string;
  aiConfidenceScore?: number;
  metadata?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}


