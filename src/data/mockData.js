export const AVAILABLE_PERMISSIONS = [
  { id: 'system.full_access', label: 'Full System Superadmin Access', category: 'System', desc: 'Unrestricted control over all platform modules, hiring, and settings' },
  { id: 'rbac.manage_admins', label: 'Manage Admin Accounts', category: 'RBAC', desc: 'Create, update, suspend, or delete admin and staff accounts' },
  { id: 'rbac.manage_roles', label: 'Create & Edit Dynamic Roles', category: 'RBAC', desc: 'Define custom positions and configure granular permission matrices' },
  { id: 'hiring.manage', label: 'Hiring & Staff Positions', category: 'Hiring', desc: 'Post new positions (Specialist Doctors, Influencers, Testers) and hire applicants' },
  { id: 'doctors.view', label: 'View Doctor Registrations', category: 'Doctors', desc: 'Inspect doctor profiles, degrees, council numbers, and documentation' },
  { id: 'doctors.verify', label: 'Approve / Reject Doctors', category: 'Doctors', desc: 'Issue MindBridge practitioner badges, approve or decline doctor signups' },
  { id: 'influencers.view', label: 'View Influencer & Campaign Data', category: 'Marketing', desc: 'Monitor traffic, trackable links, and conversion analytics' },
  { id: 'influencers.manage', label: 'Manage Campaigns & Payouts', category: 'Marketing', desc: 'Create promotional referral links, assign commission rates, approve payouts' },
  { id: 'app_control.manage', label: 'Dynamic App Control & Flags', category: 'App Control', desc: 'Toggle feature flags, global banner announcements, pricing, and maintenance' },
  { id: 'monitoring.view', label: 'Real-time Telemetry & SOS Alerts', category: 'Monitoring', desc: 'Monitor live consultation rooms, active user sessions, and crisis SOS triage' },
  { id: 'patients.manage', label: 'Patient Directory & Safety Triage', category: 'Clinical', desc: 'Inspect patient risk levels, review flagged interactions, trigger safety interventions' },
  { id: 'audit.view', label: 'Security & Compliance Audit Logs', category: 'Security', desc: 'Inspect immutable logs of all administrative actions and system updates' },
  { id: 'bugs.view', label: 'View QA Bug Desk & Task Bar', category: 'Quality Assurance', desc: 'Inspect live bug tickets, reproduction steps, and QA workflow status' },
  { id: 'bugs.create', label: 'Raise QA Bug Tickets', category: 'Quality Assurance', desc: 'Report new bug tickets with unique tracking IDs, logs, and screenshots' },
  { id: 'bugs.resolve', label: 'Update Bug Status (In Progress, Fixed, Can\'t Fix)', category: 'Quality Assurance', desc: 'Mark bugs as fixed or unfixable and dispatch email notifications to the tester' },
  { id: 'bugs.retest', label: 'Retest & Close Verified Bugs', category: 'Quality Assurance', desc: 'Perform QA regression testing on fixed/cant-fix tickets and mark closed' },
];

export const INITIAL_ROLES = [
  {
    id: 'super_admin',
    name: 'Super Administrator',
    badge: 'Superadmin',
    color: 'rose',
    isSystem: true,
    description: 'Supreme creator with unrestricted dynamic control, hiring authority, full app monitoring, and tester capabilities.',
    permissions: AVAILABLE_PERMISSIONS.map(p => p.id),
  },
  {
    id: 'specialist_doctor_verifier',
    name: 'Specialist Doctor Verification Lead',
    badge: 'Medical Board',
    color: 'emerald',
    isSystem: false,
    description: 'Senior specialist physician who validates medical licenses, council registration IDs, and approves or declines doctor onboarding.',
    permissions: [
      'doctors.view',
      'doctors.verify',
      'monitoring.view',
      'audit.view',
    ],
  },
  {
    id: 'tester_user',
    name: 'QA Tester / Quality Assurance Engineer',
    badge: 'QA Tester',
    color: 'teal',
    isSystem: false,
    description: 'Dedicated QA tester role to test the live application, raise bug tickets with unique IDs, and retest resolved or blocked issues.',
    permissions: [
      'bugs.view',
      'bugs.create',
      'bugs.retest',
      'monitoring.view',
    ],
  },
  {
    id: 'influencer_partner',
    name: 'Brand & Growth Influencer Lead',
    badge: 'Growth & PR',
    color: 'purple',
    isSystem: false,
    description: 'Influencer and ambassador partner who promotes MindBridge, generates custom referral campaigns, and monitors conversion metrics.',
    permissions: [
      'influencers.view',
      'influencers.manage',
      'monitoring.view',
    ],
  },
  {
    id: 'clinical_safety_lead',
    name: 'Crisis & Clinical Safety Lead',
    badge: 'Crisis SOS',
    color: 'amber',
    isSystem: false,
    description: 'Oversees 24/7 SOS crisis alerts, patient suicide triage protocols, and emergency escalation.',
    permissions: [
      'monitoring.view',
      'patients.manage',
      'audit.view',
    ],
  },
  {
    id: 'operations_manager',
    name: 'Platform Operations Manager',
    badge: 'Operations',
    color: 'sky',
    isSystem: false,
    description: 'Controls real-time feature flags, global patient/doctor announcements, and consultation fee matrices.',
    permissions: [
      'app_control.manage',
      'monitoring.view',
      'doctors.view',
      'audit.view',
    ],
  },
];

// Real live admin accounts only. Zero mock personas.
export const INITIAL_ADMINS = [
  {
    id: 'adm-01',
    name: 'Dr. Anubhab Nandi',
    email: 'anubhabnandi12@gmail.com',
    roleId: 'super_admin',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    title: 'Super Creator & Founder',
    status: 'active',
    lastActive: 'Online Now',
    joinedDate: 'Jan 15, 2026',
    twoFactor: true,
  },
];

// Dynamic vacancies created by Super Admin (zero demo positions)
export const INITIAL_HIRING_POSITIONS = [];

// Real QA bug tickets synchronized from live backend (zero demo tickets)
export const INITIAL_BUG_TICKETS = [];

// Real active creator campaigns (zero demo campaigns)
export const INITIAL_INFLUENCER_CAMPAIGNS = [];

// System feature flags and controls
export const INITIAL_APP_CONTROLS = {
  maintenanceMode: false,
  maintenanceMessage: 'MindBridge is performing a scheduled database optimization. Emergency SOS services remain 100% active.',
  features: {
    aiClinicalCopilot: {
      name: 'AI Clinical Copilot & Triage',
      enabled: true,
      description: 'Generates preliminary diagnostic briefs, symptom questionnaires, and severity classifications.',
      category: 'AI Services',
    },
    telehealthVideo: {
      name: 'Encrypted Telehealth Video Consults',
      enabled: true,
      description: 'WebRTC HIPAA-compliant 1080p video consultation rooms between doctors and patients.',
      category: 'Consultations',
    },
    sosEmergencyBeacon: {
      name: '24/7 Crisis SOS Beacon',
      enabled: true,
      description: 'Instant suicide hotline dialer, geolocated ambulance dispatch trigger, and priority alert dispatch.',
      category: 'Emergency',
    },
    anonymousCircles: {
      name: 'Peer Anonymous Community Circles',
      enabled: true,
      description: 'Anonymous moderated support forums for anxiety, grief, ADHD, and postpartum recovery.',
      category: 'Community',
    },
    instantRxGateway: {
      name: 'Digital E-Prescription Dispatch',
      enabled: true,
      description: 'Allows verified psychiatrists to digitally sign and route prescriptions to partner pharmacies.',
      category: 'Clinical',
    },
    influencerReferralSystem: {
      name: 'Influencer Referral & Dynamic Coupons',
      enabled: true,
      description: 'Powers affiliate link redirection, discount coupon redemption, and commission attribution.',
      category: 'Marketing',
    },
  },
  banner: {
    enabled: true,
    text: '24/7 Verified Crisis Lines Active: Tele-MANAS (14416) & Kiran (1800-599-0019) are free and confidential across India.',
    type: 'info',
    audience: 'all',
  },
  financials: {
    baseDoctorConsultFee: 75,
    platformCommissionPercent: 15,
    specialistVerifierBounty: 25,
    currency: 'USD',
  },
};

// Real live crisis alerts only (zero demo alerts)
export const INITIAL_SOS_ALERTS = [];

// Audit logs generated in real-time as administrative actions occur
export const INITIAL_AUDIT_LOGS = [];
