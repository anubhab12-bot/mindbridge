/**
 * Shared enums are expressed as `as const` objects plus a union type so they work
 * identically in the Angular bundle and the NestJS (ESM) runtime.
 */

export const Role = {
  PATIENT: 'PATIENT',
  DOCTOR: 'DOCTOR',
  ADMIN: 'ADMIN',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

/** Roles a member of the public may choose at registration. ADMIN is deliberately absent. */
export const SELF_REGISTRABLE_ROLES = [Role.PATIENT, Role.DOCTOR] as const;
export type SelfRegistrableRole = (typeof SELF_REGISTRABLE_ROLES)[number];

export const AccountStatus = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  PENDING_DELETION: 'PENDING_DELETION',
  DELETED: 'DELETED',
} as const;
export type AccountStatus = (typeof AccountStatus)[keyof typeof AccountStatus];

export const DoctorVerificationStatus = {
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
  INFO_REQUESTED: 'INFO_REQUESTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  SUSPENDED: 'SUSPENDED',
} as const;
export type DoctorVerificationStatus =
  (typeof DoctorVerificationStatus)[keyof typeof DoctorVerificationStatus];

/** Professional categories with distinct scopes of practice (India-focused v1). */
export const ProfessionalCategory = {
  PSYCHIATRIST: 'PSYCHIATRIST',
  CLINICAL_PSYCHOLOGIST: 'CLINICAL_PSYCHOLOGIST',
  COUNSELLING_PSYCHOLOGIST: 'COUNSELLING_PSYCHOLOGIST',
  PSYCHIATRIC_SOCIAL_WORKER: 'PSYCHIATRIC_SOCIAL_WORKER',
  COUNSELLOR: 'COUNSELLOR',
} as const;
export type ProfessionalCategory = (typeof ProfessionalCategory)[keyof typeof ProfessionalCategory];

export interface ScopeOfPractice {
  label: string;
  description: string;
  /** Whether the category may prescribe medication under their own registration. MindBridge has no prescribing feature. */
  mayPrescribe: boolean;
  mayDiagnose: boolean;
  services: string[];
}

export const SCOPE_OF_PRACTICE: Record<ProfessionalCategory, ScopeOfPractice> = {
  PSYCHIATRIST: {
    label: 'Psychiatrist',
    description: 'Medical doctor (MD/DNB Psychiatry) registered with a medical council.',
    mayPrescribe: true,
    mayDiagnose: true,
    services: ['Psychiatric assessment', 'Diagnosis', 'Medication management', 'Psychotherapy'],
  },
  CLINICAL_PSYCHOLOGIST: {
    label: 'Clinical psychologist',
    description: 'M.Phil/PsyD clinical psychologist registered with the Rehabilitation Council of India (RCI).',
    mayPrescribe: false,
    mayDiagnose: true,
    services: ['Psychological assessment', 'Psychotherapy', 'Psychometric testing'],
  },
  COUNSELLING_PSYCHOLOGIST: {
    label: 'Counselling psychologist',
    description: 'Postgraduate in psychology providing counselling and talk therapy.',
    mayPrescribe: false,
    mayDiagnose: false,
    services: ['Counselling', 'Talk therapy', 'Coping skills'],
  },
  PSYCHIATRIC_SOCIAL_WORKER: {
    label: 'Psychiatric social worker',
    description: 'M.Phil psychiatric social work professional.',
    mayPrescribe: false,
    mayDiagnose: false,
    services: ['Psychosocial support', 'Family support', 'Community resources'],
  },
  COUNSELLOR: {
    label: 'Counsellor',
    description: 'Trained counsellor providing supportive, non-clinical sessions.',
    mayPrescribe: false,
    mayDiagnose: false,
    services: ['Supportive counselling', 'Wellbeing sessions'],
  },
};

export const ConsultationMode = {
  ONLINE: 'ONLINE',
  IN_PERSON: 'IN_PERSON',
} as const;
export type ConsultationMode = (typeof ConsultationMode)[keyof typeof ConsultationMode];

export const AppointmentStatus = {
  REQUESTED: 'REQUESTED',
  CONFIRMED: 'CONFIRMED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  NO_SHOW: 'NO_SHOW',
} as const;
export type AppointmentStatus = (typeof AppointmentStatus)[keyof typeof AppointmentStatus];

/** Statuses that hold a doctor's time slot. */
export const SLOT_HOLDING_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.REQUESTED,
  AppointmentStatus.CONFIRMED,
];

export const ConsentType = {
  TERMS: 'TERMS',
  PRIVACY_POLICY: 'PRIVACY_POLICY',
  AI_PROCESSING: 'AI_PROCESSING',
  SHARE_MOOD_SUMMARY: 'SHARE_MOOD_SUMMARY',
  SHARE_AI_SUMMARY: 'SHARE_AI_SUMMARY',
  SHARE_INTAKE: 'SHARE_INTAKE',
  MODEL_TRAINING: 'MODEL_TRAINING',
  REMINDERS: 'REMINDERS',
  DOCTOR_AI_ASSIST: 'DOCTOR_AI_ASSIST',
} as const;
export type ConsentType = (typeof ConsentType)[keyof typeof ConsentType];

/** Consents scoped to one professional (granted per doctor). */
export const DOCTOR_SCOPED_CONSENTS: ConsentType[] = [
  ConsentType.SHARE_MOOD_SUMMARY,
  ConsentType.SHARE_AI_SUMMARY,
  ConsentType.SHARE_INTAKE,
  ConsentType.DOCTOR_AI_ASSIST,
];

export const RiskLevel = {
  NONE: 'NONE',
  LOW: 'LOW',
  ELEVATED: 'ELEVATED',
  HIGH: 'HIGH',
  IMMINENT: 'IMMINENT',
} as const;
export type RiskLevel = (typeof RiskLevel)[keyof typeof RiskLevel];

export const CrisisServiceType = {
  EMERGENCY: 'EMERGENCY',
  MENTAL_HEALTH_HELPLINE: 'MENTAL_HEALTH_HELPLINE',
  SUICIDE_PREVENTION: 'SUICIDE_PREVENTION',
  MEDICAL: 'MEDICAL',
  OTHER: 'OTHER',
} as const;
export type CrisisServiceType = (typeof CrisisServiceType)[keyof typeof CrisisServiceType];

export const ContentStatus = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  ARCHIVED: 'ARCHIVED',
} as const;
export type ContentStatus = (typeof ContentStatus)[keyof typeof ContentStatus];

export const ClinicalNoteType = {
  CONSULTATION_NOTE: 'CONSULTATION_NOTE',
  TREATMENT_PLAN: 'TREATMENT_PLAN',
  FOLLOW_UP: 'FOLLOW_UP',
} as const;
export type ClinicalNoteType = (typeof ClinicalNoteType)[keyof typeof ClinicalNoteType];

export const ClinicalNoteStatus = {
  DRAFT: 'DRAFT',
  FINAL: 'FINAL',
} as const;
export type ClinicalNoteStatus = (typeof ClinicalNoteStatus)[keyof typeof ClinicalNoteStatus];

export const DoctorAssistTask = {
  SUMMARIZE_INTAKE: 'SUMMARIZE_INTAKE',
  SUMMARIZE_AUTHORIZED_CONVERSATION: 'SUMMARIZE_AUTHORIZED_CONVERSATION',
  DRAFT_NOTE: 'DRAFT_NOTE',
  ORGANIZE_CONCERNS: 'ORGANIZE_CONCERNS',
  SUGGEST_QUESTIONS: 'SUGGEST_QUESTIONS',
  PATIENT_EDUCATION: 'PATIENT_EDUCATION',
  FOLLOW_UP_REMINDER: 'FOLLOW_UP_REMINDER',
  ADMIN_DOCUMENTATION: 'ADMIN_DOCUMENTATION',
} as const;
export type DoctorAssistTask = (typeof DoctorAssistTask)[keyof typeof DoctorAssistTask];

export const SupportTicketStatus = {
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  RESOLVED: 'RESOLVED',
  CLOSED: 'CLOSED',
} as const;
export type SupportTicketStatus = (typeof SupportTicketStatus)[keyof typeof SupportTicketStatus];

export const ModerationStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;
export type ModerationStatus = (typeof ModerationStatus)[keyof typeof ModerationStatus];

/** Fine-grained admin permissions; the seeded super-admin receives all of them. */
export const AdminPermission = {
  USERS_MANAGE: 'users:manage',
  DOCTORS_VERIFY: 'doctors:verify',
  CONTENT_MANAGE: 'content:manage',
  CRISIS_MANAGE: 'crisis:manage',
  AUDIT_READ: 'audit:read',
  SECURITY_MANAGE: 'security:manage',
  SUPPORT_MANAGE: 'support:manage',
  SETTINGS_MANAGE: 'settings:manage',
  REPORTS_EXPORT: 'reports:export',
} as const;
export type AdminPermission = (typeof AdminPermission)[keyof typeof AdminPermission];
export const ALL_ADMIN_PERMISSIONS = Object.values(AdminPermission);

export const WellnessContentType = {
  ARTICLE: 'ARTICLE',
  BREATHING: 'BREATHING',
  GROUNDING: 'GROUNDING',
  MINDFULNESS: 'MINDFULNESS',
  SLEEP: 'SLEEP',
} as const;
export type WellnessContentType = (typeof WellnessContentType)[keyof typeof WellnessContentType];

export const SupportTicketCategory = {
  ACCOUNT: 'ACCOUNT',
  BOOKING: 'BOOKING',
  TECHNICAL: 'TECHNICAL',
  PRIVACY: 'PRIVACY',
  SAFETY_CONCERN: 'SAFETY_CONCERN',
  OTHER: 'OTHER',
} as const;
export type SupportTicketCategory = (typeof SupportTicketCategory)[keyof typeof SupportTicketCategory];
