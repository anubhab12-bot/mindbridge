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
