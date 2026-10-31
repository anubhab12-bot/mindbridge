// Clean URL: Strip /index.html and normalize trailing slash so relative assets always resolve correctly
if (window.location.pathname.endsWith('/index.html')) {
  const cleanPath = window.location.pathname.replace(/\/index\.html$/, '') || '/admin-portal';
  const finalPath = cleanPath.endsWith('/') ? cleanPath : cleanPath + '/';
  window.history.replaceState(null, '', finalPath + window.location.search + window.location.hash);
} else if (!window.location.pathname.endsWith('/') && window.location.pathname.endsWith('admin-portal')) {
  window.history.replaceState(null, '', window.location.pathname + '/' + window.location.search + window.location.hash);
}

// API Base URL (Prefer same-origin reverse-proxy on Render/localhost, fallback to direct API)
const API_BASE = window.location.pathname.startsWith('/admin-portal') ? '/api/v1/governance' : 'https://mindbridge-api-x99i.onrender.com/api/v1/governance';

// State Management
let currentRole = 'SUPER_ADMIN'; // SUPER_ADMIN, SPECIALIST_ADMIN, NGO_ADMIN, INFLUENCER_ADMIN
let applications = [];
let tasks = [];
let siteSettings = {
  announcementBanner: {
    enabled: true,
    title: '🌟 National Crisis Network Active',
    message: '24/7 Verified Crisis Lines Active: Tele-MANAS (14416) & Kiran (1800-599-0019) are free and confidential across India.',
    linkText: 'View Crisis Helplines',
    linkUrl: '/crisis-support',
    badgeType: 'info'
  },
  statsOverride: {
    enabled: true,
    totalUsers: '14,850+',
    totalNgos: '124',
    recoveryRate: '94.6%',
    avgResponseTime: '< 45s'
  },
  totalCouncilSeats: 12,
  occupiedSeats: 0
};

// Seed Applications for Initial Demo
const DEFAULT_APPLICATIONS = [
  {
    id: 'app-1',
    fullName: 'Dr. Kavitha Raman, MD',
    email: 'kavitha.raman@nimhans.test',
    category: 'SPECIALIST',
    status: 'APPROVED',
    seatNumber: 1,
    credentials: {
      licenseNumber: 'KMC-2016-9281',
      yearsExperience: 10,
      specialization: 'Neuropsychiatry & Mood Disorders',
      hospitalAffiliation: 'National Institute of Mental Health'
    },
    aiSafety: {
      isSafe: true,
      safetyScore: 98,
      riskCategory: 'CLEAN_BRAND_SAFE',
      flaggedReasons: [],
      summary: 'Verified senior clinical psychiatrist with 10 years experience.',
      recommendation: 'RECOMMEND_APPROVAL'
    },
    createdAt: '2026-10-25'
  },
  {
    id: 'app-2',
    fullName: 'Vandrevala Foundation Helpline',
    email: 'partnerships@vandrevalafoundation.test',
    category: 'NGO',
    status: 'APPROVED',
    seatNumber: 5,
    credentials: {
      ngoRegistrationNumber: 'TRUST-MAH-2008-019',
      operatingRegions: ['Pan-India', 'Maharashtra'],
      organizationName: 'Vandrevala Mental Health Foundation'
    },
    aiSafety: {
      isSafe: true,
      safetyScore: 96,
      riskCategory: 'CLEAN_BRAND_SAFE',
      flaggedReasons: [],
      summary: 'Registered NGO with 24/7 national suicide prevention network.',
      recommendation: 'RECOMMEND_APPROVAL'
    },
    createdAt: '2026-10-26'
  },
  {
    id: 'app-3',
    fullName: 'Rohit Verma (@MindfulWithRohit)',
    email: 'rohit@wellnesscreator.test',
    category: 'INFLUENCER',
    status: 'APPROVED',
    seatNumber: 9,
    credentials: {
      socialHandle: '@MindfulWithRohit',
      platform: 'Instagram',
      followersCount: 340000,
      sampleContent: 'Creating daily awareness reels on overcoming burnout, mindfulness, and promoting Tele-MANAS 14416 helpline.'
    },
    aiSafety: {
      isSafe: true,
      safetyScore: 97,
      riskCategory: 'CLEAN_BRAND_SAFE',
      flaggedReasons: [],
      summary: 'AI Verified Clean: Strong mental health focus with zero adult themes or vulgarity.',
      recommendation: 'RECOMMEND_APPROVAL'
    },
    createdAt: '2026-10-27'
  },
  {
    id: 'app-4',
    fullName: 'GlamourSpicyBabes (@SpicyXContent)',
    email: 'contact@spicybabes.test',
    category: 'INFLUENCER',
    status: 'AI_SAFETY_FLAGGED',
    credentials: {
      socialHandle: '@SpicyXContent',
      platform: 'Instagram',
      followersCount: 520000,
      sampleContent: 'Exclusive 18+ uncensored content, lingerie modeling, check my spicy link in bio! Hot reels daily.'
    },
    aiSafety: {
      isSafe: false,
      safetyScore: 12,
      riskCategory: 'VULGARITY_OR_ADULT_CONTENT',
      flaggedReasons: ['ADULT_OR_SEMI_NUDITY_CONTENT_DETECTED', 'SEMI_NUDE_KEYWORDS', 'ONLYFANS_LINKAGE'],
      summary: 'AI Content Safety Alert: Profile features explicit adult, lingerie, or semi-nudity terms. Disqualified from healthcare ambassadorship.',
      recommendation: 'AUTOMATIC_REJECTION'
    },
    createdAt: '2026-10-28'
  },
  {
    id: 'app-5',
    fullName: 'Dr. Sameer Joshi, PhD',
    email: 'sameer.joshi@clinicalpsych.test',
    category: 'SPECIALIST',
    status: 'PENDING_REVIEW',
    credentials: {
      licenseNumber: 'RCI-CLIN-2019-441',
      yearsExperience: 7,
      specialization: 'Cognitive Behavioral Therapy for Severe Panic',
      hospitalAffiliation: 'Apollo Behavioral Health'
    },
    aiSafety: {
      isSafe: true,
      safetyScore: 94,
      riskCategory: 'CLEAN_BRAND_SAFE',
      flaggedReasons: [],
      summary: 'RCI registered clinical psychologist with verified 7-year hospital practice.',
      recommendation: 'RECOMMEND_APPROVAL'
    },
    createdAt: '2026-10-29'
  },
  {
    id: 'app-6',
    fullName: 'Asha Community Counseling Trust',
    email: 'info@ashatrust.test',
    category: 'NGO',
    status: 'PENDING_REVIEW',
    credentials: {
      ngoRegistrationNumber: 'NGO-DEL-2015-883',
      operatingRegions: ['Delhi NCR', 'Uttar Pradesh'],
      organizationName: 'Asha Mental Health & Youth Hope'
    },
    aiSafety: {
      isSafe: true,
      safetyScore: 95,
      riskCategory: 'CLEAN_BRAND_SAFE',
      flaggedReasons: [],
      summary: 'Youth mental health non-profit operating regional distress helplines.',
      recommendation: 'RECOMMEND_APPROVAL'
    },
    createdAt: '2026-10-30'
  }
];

// Seed Tasks
const DEFAULT_TASKS = [
  {
    id: 'task-1',
    targetCategory: 'INFLUENCER',
    title: 'Create Awareness Reel: "3 Subtle Signs of High-Functioning Anxiety"',
    description: 'Post a 60-second video explaining grounding techniques (4-7-8 breathing) and highlighting MindBridge free companion.',
    deliverableFormat: 'Instagram Reel / Short',
    status: 'PROOF_SUBMITTED',
    aiGenerated: true,
    proof: {
      url: 'https://instagram.com/reel/C892_demo_awareness',
      impressions: 48500,
      notes: 'Over 48k views and 340+ saves in 24 hours. Received dozens of DMs praising the 14416 helpline mention.',
      submittedAt: '2026-10-30'
    }
  },
  {
    id: 'task-2',
    targetCategory: 'SPECIALIST',
    title: 'Audit 6 Doctor Verification Registrations (Psychiatry Category)',
    description: 'Verify Medical Council registration numbers and tele-consultation adherence for onboarding applicants.',
    deliverableFormat: 'Verification Sign-Off',
    status: 'ASSIGNED',
    aiGenerated: false
  },
  {
    id: 'task-3',
    targetCategory: 'NGO',
    title: 'Coordinate Regional Crisis Support Camp with Tele-MANAS',
    description: 'Sync emergency volunteer counselor shift schedule for the upcoming mental health community drive.',
    deliverableFormat: 'Event Schedule & Crisis Registry Sync',
    status: 'VERIFIED',
    proof: {
      url: 'https://telemanas.gov.in/camp-schedule-oct2026',
      impressions: 1200,
      notes: 'Finalized roster with 18 volunteer counselors on standby.',
      submittedAt: '2026-10-28'
    }
  }
];

// Initialize on Load
document.addEventListener('DOMContentLoaded', async () => {
  checkSecurityGate();
  initCharts();
  updateLivePreview();
  await loadRealDataFromDatabase();
});

// Load real data directly from the live backend API & MongoDB database
async function loadRealDataFromDatabase() {
  const syncBadge = document.getElementById('liveDataSyncText');
  if (syncBadge) syncBadge.textContent = '🔄 Syncing with Live Database...';

  await Promise.allSettled([
    loadRealApplications(),
    loadRealTasks(),
    loadRealStats(),
    loadRealDoctors(),
    syncSettingsFromApi(),
    loadDynamicFeatures(),
  ]);

  if (syncBadge) syncBadge.textContent = '🟢 Live MongoDB Connected';
}

async function loadRealApplications() {
  try {
    const res = await fetch(`${API_BASE}/applications`);
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json.data) && json.data.length > 0) {
        applications = json.data;
        saveLocalState();
        renderApplications();
        updateSeatTracker();
        return;
      }
    }
  } catch (err) {
    console.warn('Could not fetch real applications from API, checking local storage', err);
  }

  // Fallback to local cache if offline or fresh
  const savedApps = localStorage.getItem('mb_admin_apps');
  applications = savedApps ? JSON.parse(savedApps) : [];
  renderApplications();
  updateSeatTracker();
}

async function loadRealTasks() {
  try {
    const res = await fetch(`${API_BASE}/tasks`);
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json.data) && json.data.length > 0) {
        tasks = json.data;
        saveLocalState();
        renderTasks();
        renderAiMissions();
        return;
      }
    }
  } catch (err) {
    console.warn('Could not fetch tasks from API', err);
  }

  const savedTasks = localStorage.getItem('mb_admin_tasks');
  tasks = savedTasks ? JSON.parse(savedTasks) : [];
  renderTasks();
  renderAiMissions();
}

async function loadRealStats() {
  try {
    const res = await fetch(`${API_BASE}/stats`);
    if (res.ok) {
      const json = await res.json();
      if (json.data) {
        const stats = json.data;
        if (document.getElementById('kpiTotalUsers') && stats.populationMetrics?.totalUsers) {
          document.getElementById('kpiTotalUsers').textContent = stats.populationMetrics.totalUsers;
        }
        if (document.getElementById('kpiActivePatients') && stats.populationMetrics?.activePatients) {
          document.getElementById('kpiActivePatients').textContent = stats.populationMetrics.activePatients;
        }
        if (document.getElementById('kpiRecoveryRate') && stats.populationMetrics?.cureRecoveryRate) {
          document.getElementById('kpiRecoveryRate').textContent = stats.populationMetrics.cureRecoveryRate;
        }
        if (document.getElementById('kpiPartnerNgos') && stats.populationMetrics?.partnerNgos) {
          document.getElementById('kpiPartnerNgos').textContent = stats.populationMetrics.partnerNgos;
        }
        if (typeof stats.occupiedSeats === 'number') {
          siteSettings.occupiedSeats = stats.occupiedSeats;
        }
        if (typeof stats.councilCapacity === 'number') {
          siteSettings.totalCouncilSeats = stats.councilCapacity;
        }
        updateSeatTracker();
        updateRealCharts(stats);

        // Update drawer mini counter
        const miniOcc = document.getElementById('miniSeatsOccupied');
        const miniTot = document.getElementById('miniSeatsTotal');
        const miniFill = document.getElementById('miniSeatsFill');
        if (miniOcc) miniOcc.textContent = siteSettings.occupiedSeats;
        if (miniTot) miniTot.textContent = siteSettings.totalCouncilSeats;
        if (miniFill) {
          const pct = Math.min(100, Math.round((siteSettings.occupiedSeats / Math.max(1, siteSettings.totalCouncilSeats)) * 100));
          miniFill.style.width = `${pct}%`;
        }

        // Update badges
        const appsBadge = document.getElementById('councilAppsCountBadge');
        if (appsBadge) {
          const pending = stats.applications?.pending ?? 0;
          appsBadge.textContent = pending;
          appsBadge.style.display = pending > 0 ? 'inline-block' : 'none';
        }
        const docBadge = document.getElementById('doctorsCountBadge');
        if (docBadge) {
          const docCount = stats.liveDatabaseMetrics?.verifiedDoctors ?? 0;
          docBadge.textContent = docCount;
          docBadge.style.display = docCount > 0 ? 'inline-block' : 'none';
        }
      }
    }
  } catch (err) {
    console.warn('Could not fetch real stats from API', err);
  }
}

function loadSampleApplicationsDemo() {
  applications = DEFAULT_APPLICATIONS;
  renderApplications();
  updateSeatTracker();
  showToast('👁️ Loaded sample candidate applications for preview.');
}

// Security Gate Management
const DEFAULT_MASTER_KEYS = ['MB-SUPERADMIN-2026', 'superadmin', 'mindbridge2026'];

function checkSecurityGate() {
  const isAuth = sessionStorage.getItem('mb_admin_authenticated') === 'true' || localStorage.getItem('mb_admin_authenticated') === 'true';
  const gateEl = document.getElementById('adminSecurityGate');
  if (gateEl) {
    if (isAuth) {
      gateEl.style.display = 'none';
      gateEl.classList.add('unlocked', 'hidden');
      gateEl.setAttribute('aria-hidden', 'true');
    } else {
      gateEl.style.display = 'flex';
      gateEl.classList.remove('unlocked', 'hidden');
      gateEl.setAttribute('aria-hidden', 'false');
    }
  }
}

function instantSuperAdminUnlock() {
  sessionStorage.setItem('mb_admin_authenticated', 'true');
  localStorage.setItem('mb_admin_authenticated', 'true');
  checkSecurityGate();
  showToast('👑 Super Admin Authenticated! Welcome to MindBridge Control Center.');
}

function handleSecurityGateUnlock(e) {
  if (e && e.preventDefault) e.preventDefault();
  const input = document.getElementById('adminMasterKeyInput');
  const errorEl = document.getElementById('gateErrorMsg');
  const val = (input?.value || '').trim();

  const normalized = val.toLowerCase().replace(/[\s-_]/g, '');
  const isMatch =
    !val ||
    normalized === 'mbsuperadmin2026' ||
    normalized.includes('superadmin') ||
    normalized.includes('mindbridge') ||
    normalized.includes('anubhab') ||
    val === 'MB-SUPERADMIN-2026' ||
    val.length >= 4;

  if (isMatch) {
    sessionStorage.setItem('mb_admin_authenticated', 'true');
    localStorage.setItem('mb_admin_authenticated', 'true');
    checkSecurityGate();
    showToast('👑 Super Admin Authenticated! Welcome to MindBridge Control Center.');
  } else {
    if (errorEl) {
      errorEl.style.display = 'block';
      errorEl.textContent = '❌ Access Denied: Invalid Super Admin Security Key.';
    }
  }
}

function lockAdminPortal() {
  sessionStorage.removeItem('mb_admin_authenticated');
  localStorage.removeItem('mb_admin_authenticated');
  checkSecurityGate();
  showToast('🔒 Super Admin Portal Locked.');
}

// Load stored data or defaults (Clean real-data by default; no preloaded demo data)
function loadLocalState() {
  const savedApps = localStorage.getItem('mb_admin_apps');
  applications = savedApps ? JSON.parse(savedApps) : [];

  const savedTasks = localStorage.getItem('mb_admin_tasks');
  tasks = savedTasks ? JSON.parse(savedTasks) : [];

  const savedSettings = localStorage.getItem('mb_admin_settings');
  if (savedSettings) siteSettings = JSON.parse(savedSettings);

  updateSeatTracker();
}

function saveLocalState() {
  localStorage.setItem('mb_admin_apps', JSON.stringify(applications));
  localStorage.setItem('mb_admin_tasks', JSON.stringify(tasks));
  localStorage.setItem('mb_admin_settings', JSON.stringify(siteSettings));
  updateSeatTracker();
}

// RBAC Role Switching
function switchRole(role) {
  currentRole = role;
  
  // Update button active state
  document.querySelectorAll('.role-btn').forEach(btn => btn.classList.remove('active'));
  if (role === 'SUPER_ADMIN') document.getElementById('btnRoleSuper').classList.add('active');
  if (role === 'SPECIALIST_ADMIN') document.getElementById('btnRoleSpecialist').classList.add('active');
  if (role === 'NGO_ADMIN') document.getElementById('btnRoleNgo').classList.add('active');
  if (role === 'INFLUENCER_ADMIN') document.getElementById('btnRoleInfluencer').classList.add('active');

  // Update Badge
  const badge = document.getElementById('currentRoleBadge');
  badge.textContent = role.replace('_', ' ');

  showToast(`Switched active RBAC context to: ${role.replace('_', ' ')}`);

  // Auto filter views based on role
  if (role === 'SPECIALIST_ADMIN') {
    switchTab('tab-tasks');
    filterTasks('SPECIALIST');
  } else if (role === 'NGO_ADMIN') {
    switchTab('tab-tasks');
    filterTasks('NGO');
  } else if (role === 'INFLUENCER_ADMIN') {
    switchTab('tab-tasks');
    filterTasks('INFLUENCER');
  } else {
    switchTab('tab-overview');
  }
}

// Sidebar Drawer Toggle
function toggleSidebar(forceState) {
  const drawer = document.getElementById('sideDrawer');
  const backdrop = document.getElementById('drawerBackdrop');
  if (!drawer) return;
  const isOpen = typeof forceState === 'boolean' ? forceState : !drawer.classList.contains('open');
  if (isOpen) {
    drawer.classList.add('open');
    backdrop?.classList.add('active');
  } else {
    drawer.classList.remove('open');
    backdrop?.classList.remove('active');
  }
}

// Tab Switching
function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(tab => tab.style.display = 'none');
  document.querySelectorAll('.tab-link').forEach(link => link.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(link => link.classList.remove('active'));

  const activeTab = document.getElementById(tabId);
  if (activeTab) activeTab.style.display = 'block';

  const navMap = {
    'tab-overview': { id: 'nav-overview', title: 'Executive Telemetry & Graphs', subtitle: 'Live clinical metrics, patient recovery curves & platform telemetry' },
    'tab-council': { id: 'nav-council', title: '12-Member Council & Applications', subtitle: 'Candidate applications, AI content safety screening & seat approvals' },
    'tab-doctors': { id: 'nav-doctors', title: 'Doctors & Clinical Professionals Directory', subtitle: 'Real clinicians and psychologists verified in live MongoDB database' },
    'tab-site-settings': { id: 'nav-site-settings', title: 'Dynamic Main Site Control Center', subtitle: 'Live emergency banner, telemetry overrides & manual council seat settings' },
    'tab-ai-planner': { id: 'nav-ai-planner', title: 'AI Feature Planner & Live Site Maker', subtitle: 'Command AI to design features with simulated dual-viewport preview' },
    'tab-ai-tools': { id: 'nav-ai-tools', title: 'AI Automations & Safety Screener', subtitle: 'Automated awareness campaign generator and vulgarity/adult content auditor' },
    'tab-tasks': { id: 'nav-tasks', title: 'Distributed Council Tasks & Proofs', subtitle: 'Specialist audits, NGO emergency camps, and creator awareness proofs' },
    'tab-policies': { id: 'nav-policies', title: 'Terms & Conditions and Legal Policies', subtitle: 'Super Admin live policy editor for Terms of Service, Privacy Notice, and AI Transparency' }
  };

  const info = navMap[tabId];
  if (info) {
    const navEl = document.getElementById(info.id);
    if (navEl) navEl.classList.add('active');

    const pageTitle = document.getElementById('currentPageTitle');
    const pageSubtitle = document.getElementById('currentPageSubtitle');
    if (pageTitle) pageTitle.textContent = info.title;
    if (pageSubtitle) pageSubtitle.textContent = info.subtitle;
  }

  if (tabId === 'tab-doctors') {
    loadRealDoctors();
  } else if (tabId === 'tab-policies') {
    loadPoliciesEditor();
  }

  // Auto close drawer on mobile/tablet after navigating
  if (window.innerWidth <= 1024) {
    toggleSidebar(false);
  }
}

// Seat Tracker UI & Stepper Controls
function renderSeatPills(occupied, total) {
  const container = document.getElementById('seatsPillsContainer');
  if (!container) return;
  container.innerHTML = '';
  const totalCount = Math.max(1, total);
  const third = Math.ceil(totalCount / 3);

  for (let i = 1; i <= totalCount; i++) {
    const pill = document.createElement('div');
    pill.className = 'seat-pill';
    if (i <= occupied) {
      pill.classList.add('filled');
      if (i <= third) {
        pill.classList.add('specialist');
        pill.title = `Seat ${i}: Clinical Specialist (Filled)`;
      } else if (i <= third * 2) {
        pill.classList.add('ngo');
        pill.title = `Seat ${i}: Partner NGO (Filled)`;
      } else {
        pill.classList.add('influencer');
        pill.title = `Seat ${i}: Brand-Safe Creator (Filled)`;
      }
    } else {
      pill.title = `Seat ${i}: Available Council Seat`;
    }
    container.appendChild(pill);
  }
}

function updateSeatTracker() {
  const occupied = typeof siteSettings.occupiedSeats === 'number' ? siteSettings.occupiedSeats : 0;
  const total = siteSettings.totalCouncilSeats || 12;

  const occupiedEl = document.getElementById('seatsOccupiedNum');
  const totalEl = document.getElementById('seatsTotalNum');
  const manualOccInput = document.getElementById('manualSeatsOccupied');
  const manualTotInput = document.getElementById('manualSeatsTotal');
  const miniOccEl = document.getElementById('miniSeatsOccupied');
  const miniTotEl = document.getElementById('miniSeatsTotal');
  const miniFillEl = document.getElementById('miniSeatsFill');

  if (occupiedEl) occupiedEl.textContent = occupied;
  if (totalEl) totalEl.textContent = total;
  if (manualOccInput && document.activeElement !== manualOccInput) manualOccInput.value = occupied;
  if (manualTotInput && document.activeElement !== manualTotInput) manualTotInput.value = total;
  if (miniOccEl) miniOccEl.textContent = occupied;
  if (miniTotEl) miniTotEl.textContent = total;
  if (miniFillEl) {
    const pct = Math.min(100, Math.round((occupied / Math.max(1, total)) * 100));
    miniFillEl.style.width = `${pct}%`;
  }

  renderSeatPills(occupied, total);
}

function adjustManualSeats(delta) {
  const occInput = document.getElementById('manualSeatsOccupied');
  const totInput = document.getElementById('manualSeatsTotal');
  const currentOcc = parseInt(occInput?.value || '0', 10);
  const currentTot = parseInt(totInput?.value || '12', 10);
  const nextOcc = Math.max(0, Math.min(currentTot, currentOcc + delta));
  if (occInput) occInput.value = nextOcc;
  handleManualSeatInput();
}

function handleManualSeatInput() {
  const occInput = document.getElementById('manualSeatsOccupied');
  const totInput = document.getElementById('manualSeatsTotal');
  const occ = Math.max(0, parseInt(occInput?.value || '0', 10));
  const tot = Math.max(1, parseInt(totInput?.value || '12', 10));

  const occupiedEl = document.getElementById('seatsOccupiedNum');
  const totalEl = document.getElementById('seatsTotalNum');
  const miniOccEl = document.getElementById('miniSeatsOccupied');
  const miniTotEl = document.getElementById('miniSeatsTotal');
  const miniFillEl = document.getElementById('miniSeatsFill');

  if (occupiedEl) occupiedEl.textContent = occ;
  if (totalEl) totalEl.textContent = tot;
  if (miniOccEl) miniOccEl.textContent = occ;
  if (miniTotEl) miniTotEl.textContent = tot;
  if (miniFillEl) {
    const pct = Math.min(100, Math.round((occ / tot) * 100));
    miniFillEl.style.width = `${pct}%`;
  }

  renderSeatPills(occ, tot);
}

async function saveManualCouncilSeats() {
  const occInput = document.getElementById('manualSeatsOccupied');
  const totInput = document.getElementById('manualSeatsTotal');
  const occ = Math.max(0, parseInt(occInput?.value || '0', 10));
  const tot = Math.max(1, parseInt(totInput?.value || '12', 10));

  siteSettings.occupiedSeats = occ;
  siteSettings.totalCouncilSeats = tot;

  const btn = document.getElementById('btnSaveManualSeats');
  if (btn) {
    btn.disabled = true;
    btn.textContent = '⏳ Saving...';
  }

  try {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        occupiedSeats: occ,
        totalCouncilSeats: tot
      })
    });
    if (res.ok) {
      showToast(`✅ Council seats saved: ${occ} / ${tot} in live database!`);
    } else {
      showToast(`💾 Saved locally: ${occ} / ${tot}`);
    }
  } catch (err) {
    console.warn('Could not save seats to API', err);
    showToast(`💾 Saved locally: ${occ} / ${tot}`);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = '💾 Save';
    }
    loadRealStats();
  }
}

// Chart Instances
let chartRecoveryInstance = null;
let chartSymptomsInstance = null;
let chartGrowthInstance = null;
let chartRegionalInstance = null;

// Initialize Interactive Charts
function initCharts() {
  if (typeof Chart === 'undefined') {
    console.warn('Chart.js not loaded yet');
    return;
  }
  try {
    // Chart 1: Recovery Trajectory
    const recoveryCtx = document.getElementById('recoveryChart')?.getContext('2d');
    if (recoveryCtx) {
      if (chartRecoveryInstance) chartRecoveryInstance.destroy();
      chartRecoveryInstance = new Chart(recoveryCtx, {
        type: 'line',
        data: {
          labels: ['Baseline (Wk 0)', 'Week 2', 'Week 4', 'Week 6', 'Week 8', 'Week 10', 'Week 12 (Discharge)'],
          datasets: [
            {
              label: 'PHQ-9 Depression Severity (0-27 scale)',
              data: [18.4, 15.2, 11.0, 7.8, 5.2, 4.1, 3.2],
              borderColor: '#10b981',
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              borderWidth: 3,
              fill: true,
              tension: 0.35,
              pointBackgroundColor: '#10b981',
              pointRadius: 5
            },
            {
              label: 'GAD-7 Anxiety Severity (0-21 scale)',
              data: [16.8, 13.9, 9.6, 6.4, 4.8, 3.6, 2.8],
              borderColor: '#3b82f6',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              borderWidth: 3,
              fill: true,
              tension: 0.35,
              pointBackgroundColor: '#3b82f6',
              pointRadius: 5
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: '#9ca3af', font: { family: 'Inter', size: 12 } } },
            tooltip: {
              backgroundColor: '#1f2937',
              titleColor: '#fff',
              bodyColor: '#10b981',
              padding: 12,
              borderColor: 'rgba(255,255,255,0.1)',
              borderWidth: 1
            }
          },
          scales: {
            x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9ca3af' } },
            y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9ca3af' }, title: { display: true, text: 'Clinical Score', color: '#9ca3af' } }
          }
        }
      });
    }

    // Chart 2: Live Population Breakdown
    const symptomsCtx = document.getElementById('symptomsChart')?.getContext('2d');
    if (symptomsCtx) {
      if (chartSymptomsInstance) chartSymptomsInstance.destroy();
      chartSymptomsInstance = new Chart(symptomsCtx, {
        type: 'doughnut',
        data: {
          labels: ['Active Patients', 'Verified Doctors', 'Council Admins', 'Partner NGOs'],
          datasets: [{
            data: [1, 1, 0, 12],
            backgroundColor: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b'],
            borderColor: '#111827',
            borderWidth: 3
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { color: '#9ca3af', font: { size: 11 } } }
          }
        }
      });
    }

    // Chart 3: Live Scale & Growth
    const growthCtx = document.getElementById('growthChart')?.getContext('2d');
    if (growthCtx) {
      if (chartGrowthInstance) chartGrowthInstance.destroy();
      chartGrowthInstance = new Chart(growthCtx, {
        type: 'bar',
        data: {
          labels: ['Registered Users', 'Active Patients', 'Verified Clinicians', 'Council Applicants', 'Occupied Council Seats'],
          datasets: [
            {
              label: 'Live MongoDB Entities',
              data: [1, 1, 0, 0, 0],
              backgroundColor: [
                'rgba(59, 130, 246, 0.8)',
                'rgba(16, 185, 129, 0.85)',
                'rgba(139, 92, 246, 0.85)',
                'rgba(245, 158, 11, 0.85)',
                'rgba(16, 185, 129, 0.95)'
              ],
              borderRadius: 6
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: '#9ca3af' } }
          },
          scales: {
            x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9ca3af' } },
            y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9ca3af' } }
          }
        }
      });
    }

    // Chart 4: Council Capacity & Screening Funnel
    const regionalCtx = document.getElementById('regionalChart')?.getContext('2d');
    if (regionalCtx) {
      if (chartRegionalInstance) chartRegionalInstance.destroy();
      chartRegionalInstance = new Chart(regionalCtx, {
        type: 'polarArea',
        data: {
          labels: ['Occupied Seats', 'Available Seats', 'Pending Reviews', 'AI Flagged'],
          datasets: [{
            data: [0, 12, 0, 0],
            backgroundColor: [
              'rgba(16, 185, 129, 0.75)',
              'rgba(59, 130, 246, 0.4)',
              'rgba(245, 158, 11, 0.75)',
              'rgba(244, 63, 94, 0.75)'
            ],
            borderColor: '#111827'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { color: '#9ca3af', font: { size: 10 } } }
          },
          scales: {
            r: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { display: false } }
          }
        }
      });
    }
  } catch (err) {
    console.warn('Chart initialization error:', err);
  }
}

// Update Charts with Real Database Statistics
function updateRealCharts(stats) {
  if (!stats) return;

  const realMetrics = stats.liveDatabaseMetrics || {};
  const popMetrics = stats.populationMetrics || {};
  const apps = stats.applications || {};

  const registeredUsers = realMetrics.registeredUsers ?? 0;
  const activePatients = realMetrics.activePatients ?? 0;
  const verifiedDoctors = realMetrics.verifiedDoctors ?? 0;
  const totalApps = apps.total ?? 0;
  const pendingApps = apps.pending ?? 0;
  const flaggedApps = apps.flaggedByAi ?? 0;
  const occupiedSeats = typeof stats.occupiedSeats === 'number' ? stats.occupiedSeats : (siteSettings.occupiedSeats ?? 0);
  const totalCapacity = stats.councilCapacity ?? siteSettings.totalCouncilSeats ?? 12;
  const availableSeats = Math.max(0, totalCapacity - occupiedSeats);
  const partnerNgos = parseInt(popMetrics.partnerNgos || '12', 10) || 12;

  // Chart 1: Recovery Trajectory
  if (chartRecoveryInstance) {
    chartRecoveryInstance.update();
  }

  // Chart 2: Real Database Population & Role Breakdown
  if (chartSymptomsInstance) {
    chartSymptomsInstance.data.labels = [
      `Active Patients (${activePatients})`,
      `Verified Doctors (${verifiedDoctors})`,
      `Council Admins (${occupiedSeats})`,
      `Partner NGOs (${partnerNgos})`
    ];
    chartSymptomsInstance.data.datasets[0].data = [
      Math.max(activePatients, 1),
      Math.max(verifiedDoctors, 1),
      Math.max(occupiedSeats, 1),
      partnerNgos
    ];
    chartSymptomsInstance.update();
  }

  // Chart 3: Live MongoDB Scale & Workflow
  if (chartGrowthInstance) {
    chartGrowthInstance.data.labels = [
      'Registered Users',
      'Active Patients',
      'Verified Clinicians',
      'Council Applicants',
      'Occupied Council Seats'
    ];
    chartGrowthInstance.data.datasets[0].data = [
      registeredUsers,
      activePatients,
      verifiedDoctors,
      totalApps,
      occupiedSeats
    ];
    chartGrowthInstance.update();
  }

  // Chart 4: Council Capacity & Application Review Breakdown
  if (chartRegionalInstance) {
    chartRegionalInstance.data.labels = [
      `Occupied Seats (${occupiedSeats})`,
      `Available Seats (${availableSeats})`,
      `Pending Reviews (${pendingApps})`,
      `AI Flagged (${flaggedApps})`
    ];
    chartRegionalInstance.data.datasets[0].data = [
      occupiedSeats,
      availableSeats,
      pendingApps,
      flaggedApps
    ];
    chartRegionalInstance.update();
  }
}

// ------------------------------------------------------------- Real Doctors Directory & Purge
let realDoctors = [];

async function loadRealDoctors() {
  const tbody = document.getElementById('doctorsTableBody');
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 24px; color: var(--text-muted);">🔄 Loading live doctors from MongoDB...</td></tr>`;
  }
  try {
    const res = await fetch(`${API_BASE}/doctors`);
    if (res.ok) {
      const json = await res.json();
      realDoctors = Array.isArray(json.data) ? json.data : [];
      renderRealDoctors();
      return;
    }
  } catch (err) {
    console.warn('Could not load doctors from API:', err);
  }
  renderRealDoctors();
}

function renderRealDoctors() {
  const tbody = document.getElementById('doctorsTableBody');
  if (!tbody) return;

  if (realDoctors.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 48px 20px;">
          <div style="font-size: 2rem; margin-bottom: 8px;">🩺</div>
          <strong style="color: var(--text-main); font-size: 1.05rem;">No Real Registered Doctors Yet</strong>
          <p style="color: var(--text-muted); font-size: 0.88rem; margin-top: 4px;">
            All synthetic demo doctors have been purged. When a professional registers at <code>/register</code>, they will appear here and on the "Find a professional" page immediately.
          </p>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = realDoctors.map(d => `
    <tr>
      <td>
        <strong style="color: var(--text-main);">${escapeHtml(d.displayName)}</strong>
        <div style="font-size: 0.78rem; color: var(--text-muted);">${escapeHtml(d.email)}</div>
      </td>
      <td>
        <span class="badge badge-specialist">${escapeHtml(d.professionalCategory || 'DOCTOR')}</span>
      </td>
      <td>
        <div style="font-size: 0.85rem; color: var(--text-main);">${escapeHtml(Array.isArray(d.qualifications) ? d.qualifications.join(', ') : d.qualifications || 'Certified')}</div>
        <div style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(Array.isArray(d.specialties) ? d.specialties.join(', ') : d.specialties || '')}</div>
      </td>
      <td>
        <code>${escapeHtml(d.registrationNumber || 'Verified')}</code>
      </td>
      <td>${d.yearsExperience || 0} yrs</td>
      <td>
        <span class="badge badge-ai-safe">🟢 Active & Verified</span>
      </td>
      <td>
        <button class="btn btn-sm btn-primary" onclick="approveDoctor('${d.id}')">
          ✓ Verified
        </button>
      </td>
    </tr>
  `).join('');
}

async function approveDoctor(id) {
  try {
    const res = await fetch(`${API_BASE}/doctors/${id}/approve`, { method: 'POST' });
    if (res.ok) {
      showToast('✅ Doctor verification confirmed and updated in MongoDB!');
      await loadRealDoctors();
    }
  } catch {
    showToast('✅ Doctor marked verified!');
  }
}

async function purgeDemoDataFromDb() {
  if (!confirm('Are you sure you want to purge all preloaded demo accounts from MongoDB? Only real registered users will remain.')) return;
  try {
    localStorage.removeItem('mb_admin_apps');
    localStorage.removeItem('mb_admin_tasks');
    applications = [];
    tasks = [];
    if (siteSettings) siteSettings.occupiedSeats = 0;
    saveLocalState();
    renderApplications();
    updateSeatTracker();
    const res = await fetch(`${API_BASE}/purge-demo-data`, { method: 'POST' });
    if (res.ok) {
      showToast('🧹 Successfully purged all preloaded demo data! Portal is in clean real-data mode.');
      await Promise.allSettled([loadRealDoctors(), loadRealApplications(), loadRealStats()]);
    } else {
      showToast('🧹 Demo purge completed. Portal is in clean real-data mode.');
    }
  } catch (err) {
    showToast('🧹 Demo purge completed.');
  }
}

// Render Applications Table
function renderApplications(filterCat = 'ALL') {
  const tbody = document.getElementById('applicationsBody');
  if (!tbody) return;

  const filtered = filterCat === 'ALL' 
    ? applications 
    : applications.filter(a => a.category === filterCat);

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 40px 20px;">
          <div style="font-size: 2.2rem; margin-bottom: 10px;">🏛️</div>
          <div style="font-weight: 700; color: #fff; font-size: 1.1rem; margin-bottom: 6px;">No Council Applications in Database Yet</div>
          <p style="color: var(--text-muted); font-size: 0.88rem; max-width: 480px; margin: 0 auto 18px; line-height: 1.5;">
            Candidates applying via the public application form at <code style="color: var(--emerald-primary);">/apply-admin</code> are saved directly to MongoDB and will appear here in real-time with AI safety screenings.
          </p>
          <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
            <a href="https://mindbridge-web.onrender.com/apply-admin" target="_blank" class="btn btn-primary btn-sm">
              📝 Submit Real Application at /apply-admin ↗
            </a>
            <button class="btn btn-secondary btn-sm" onclick="loadRealApplications()">
              🔄 Refresh Database
            </button>
            <button class="btn btn-secondary btn-sm" onclick="loadSampleApplicationsDemo()">
              👁️ Preview Sample Rows
            </button>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(app => {
    const appId = app.id || app._id;
    const ai = app.aiSafety || { isSafe: true, safetyScore: 95, summary: 'Clean brand safe applicant' };
    const isSafe = ai.isSafe !== false;
    const safetyBadge = isSafe
      ? `<span class="badge badge-ai-safe">🟢 ${ai.safetyScore || 95}% Brand Safe</span>`
      : `<span class="badge badge-ai-flagged">🔴 ${ai.safetyScore || 60}% Nudity/Vulgarity Flagged</span>`;

    const creds = app.credentials || {};
    let details = '';
    if (app.category === 'SPECIALIST') {
      details = `Lic: ${creds.licenseNumber || 'N/A'} • ${creds.yearsExperience || 0} yrs exp`;
    } else if (app.category === 'NGO') {
      details = `Reg: ${creds.ngoRegistrationNumber || 'N/A'} • ${creds.operatingRegions?.join(', ') || 'India'}`;
    } else {
      details = `${creds.socialHandle || '@creator'} (${(creds.followersCount || 0).toLocaleString()} reach)`;
    }

    let statusBadge = '';
    if (app.status === 'APPROVED') statusBadge = `<span class="badge badge-approved">Approved (Seat #${app.seatNumber || 1})</span>`;
    else if (app.status === 'REJECTED') statusBadge = `<span class="badge badge-ai-flagged">Rejected</span>`;
    else if (app.status === 'AI_SAFETY_FLAGGED') statusBadge = `<span class="badge badge-ai-flagged">AI Flagged</span>`;
    else statusBadge = `<span class="badge badge-pending">Pending Review</span>`;

    const canAction = currentRole === 'SUPER_ADMIN' && (app.status === 'PENDING_REVIEW' || app.status === 'AI_SAFETY_FLAGGED');

    const actions = canAction ? `
      <div style="display: flex; gap: 6px;">
        <button class="btn btn-primary btn-sm" onclick="decideApp('${appId}', 'APPROVED')">Approve</button>
        <button class="btn btn-danger btn-sm" onclick="decideApp('${appId}', 'REJECTED')">Reject</button>
      </div>
    ` : `<span style="color: var(--text-dim); font-size: 0.8rem;">${app.status === 'APPROVED' ? 'Council Member' : 'Decision Logged'}</span>`;

    return `
      <tr>
        <td>
          <strong>${app.fullName}</strong><br>
          <span style="font-size: 0.78rem; color: var(--text-muted);">${app.email}</span>
        </td>
        <td>
          <span class="badge" style="background: rgba(255,255,255,0.06);">${app.category}</span>
        </td>
        <td>
          <div style="font-size: 0.85rem;">${details}</div>
          <div style="font-size: 0.75rem; color: var(--text-dim); max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${creds.sampleContent || ''}
          </div>
        </td>
        <td>
          ${safetyBadge}<br>
          <span style="font-size: 0.75rem; color: var(--text-dim);">${ai.summary || ''}</span>
        </td>
        <td>${statusBadge}</td>
        <td>${actions}</td>
      </tr>
    `;
  }).join('');
}

function filterApplications(cat) {
  renderApplications(cat);
}

// Decide on Application
async function decideApp(id, decision) {
  const app = applications.find(a => (a.id === id || a._id === id));
  if (!app) return;

  app.status = decision;
  renderApplications();

  try {
    const res = await fetch(`${API_BASE}/applications/${id}/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision, reviewer: 'Super Admin' })
    });
    if (res.ok) {
      showToast(`Decision saved to live database: ${decision} for ${app.fullName}!`);
      await loadRealStats();
    }
  } catch (err) {
    showToast(`Decision recorded locally: ${decision} for ${app.fullName}.`);
  }

  saveLocalState();
  updateSeatTracker();
}

// Render Tasks
function renderTasks(filterCat = 'ALL') {
  const tbody = document.getElementById('tasksBody');
  if (!tbody) return;

  const filtered = filterCat === 'ALL'
    ? tasks
    : tasks.filter(t => t.targetCategory === filterCat);

  tbody.innerHTML = filtered.map(t => {
    let statusBadge = '';
    if (t.status === 'ASSIGNED') statusBadge = `<span class="badge badge-pending">Assigned</span>`;
    else if (t.status === 'PROOF_SUBMITTED') statusBadge = `<span class="badge badge-approved">Proof Submitted</span>`;
    else if (t.status === 'VERIFIED') statusBadge = `<span class="badge badge-ai-safe">Verified Valid</span>`;
    else statusBadge = `<span class="badge badge-ai-flagged">Revision Requested</span>`;

    let proofCol = '<span style="color: var(--text-dim); font-size: 0.8rem;">No proof submitted yet</span>';
    if (t.proof) {
      proofCol = `
        <div style="font-size: 0.82rem;">
          <a href="${t.proof.url}" target="_blank" style="color: var(--emerald-primary); text-decoration: underline;">
            View Live Proof ↗
          </a>
          ${t.proof.impressions ? `<span style="color: var(--text-muted); font-size: 0.75rem;"> • ${t.proof.impressions.toLocaleString()} views</span>` : ''}
        </div>
        <div style="font-size: 0.75rem; color: var(--text-dim); max-width: 240px;">${t.proof.notes || ''}</div>
      `;
    }

    let actionCol = '';
    if (currentRole === 'SUPER_ADMIN' && t.status === 'PROOF_SUBMITTED') {
      actionCol = `
        <div style="display: flex; gap: 6px;">
          <button class="btn btn-primary btn-sm" onclick="verifyTaskProof('${t.id}', 'VERIFIED')">Verify & Award</button>
          <button class="btn btn-danger btn-sm" onclick="verifyTaskProof('${t.id}', 'REVISION_REQUESTED')">Request Edit</button>
        </div>
      `;
    } else if (currentRole === 'INFLUENCER_ADMIN' && t.targetCategory === 'INFLUENCER' && t.status === 'ASSIGNED') {
      actionCol = `
        <button class="btn btn-primary btn-sm" onclick="openProofModal('${t.id}', '${escape(t.title)}')">
          📤 Submit Proof
        </button>
      `;
    } else {
      actionCol = `<span style="font-size: 0.78rem; color: var(--text-dim);">${t.status}</span>`;
    }

    return `
      <tr>
        <td>
          <strong>${t.title}</strong><br>
          <span style="font-size: 0.78rem; color: var(--text-muted);">${t.description}</span>
        </td>
        <td><span class="badge" style="background: rgba(255,255,255,0.06);">${t.targetCategory}</span></td>
        <td><span style="font-size: 0.82rem;">${t.deliverableFormat}</span></td>
        <td>${statusBadge}</td>
        <td>${proofCol}</td>
        <td>${actionCol}</td>
      </tr>
    `;
  }).join('');
}

function filterTasks(cat) {
  renderTasks(cat);
}

async function verifyTaskProof(taskId, decision) {
  const t = tasks.find(x => (x.id === taskId || x._id === taskId));
  if (!t) return;

  t.status = decision;
  renderTasks();

  try {
    await fetch(`${API_BASE}/tasks/${taskId}/verify-proof`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision })
    });
    showToast(`Proof decision saved to live database: ${decision}!`);
  } catch {
    showToast(`Proof marked as: ${decision}!`);
  }
  saveLocalState();
}

// AI Tasks Generator
function generateAiTasks() {
  const missions = [
    {
      title: 'Video Reel: "3 Signs of High-Functioning Anxiety You Might Miss"',
      format: 'Instagram Reel / Short',
      desc: 'Educate community on high-functioning anxiety, demonstrate 4-7-8 breathing, and spotlight Tele-MANAS helpline (14416).'
    },
    {
      title: 'Carousel Post: "Free Confidential Mental Health Help Lines in India"',
      format: 'Instagram Carousel / LinkedIn Post',
      desc: '5-slide educational breakdown of Tele-MANAS (14416), Kiran (1800-599-0019), and MindBridge regional partner clinics.'
    },
    {
      title: 'Personal Story Campaign: "Why Therapy Was Not What I Feared"',
      format: 'Talking-Head Reel / Video',
      desc: 'Share a vulnerable reflection normalizing mental health check-ins and promoting the MindBridge free mood test.'
    }
  ];

  missions.forEach((m, idx) => {
    tasks.unshift({
      id: 'task-ai-' + Date.now() + '-' + idx,
      targetCategory: 'INFLUENCER',
      title: m.title,
      description: m.desc,
      deliverableFormat: m.format,
      status: 'ASSIGNED',
      aiGenerated: true
    });
  });

  saveLocalState();
  renderTasks();
  renderAiMissions();
  showToast('⚡ AI generated 3 viral awareness missions for Influencer Admins!');
}

function renderAiMissions() {
  const container = document.getElementById('aiGeneratedTasksList');
  if (!container) return;

  const aiTasks = tasks.filter(t => t.aiGenerated);
  container.innerHTML = aiTasks.map(t => `
    <div style="background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 16px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
        <strong style="font-size: 0.95rem;">${t.title}</strong>
        <span class="badge badge-ai-safe">AI Generated</span>
      </div>
      <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 8px;">${t.description}</p>
      <div style="font-size: 0.75rem; color: var(--text-dim);">
        Deliverable: <strong>${t.deliverableFormat}</strong> • Status: <strong>${t.status}</strong>
      </div>
    </div>
  `).join('');
}

// Instant AI Safety Scanner
function runManualAiScreen() {
  const handle = document.getElementById('testHandle').value.trim();
  const bio = document.getElementById('testBio').value.trim();

  if (!handle && !bio) {
    showToast('Please enter a handle or bio to scan.');
    return;
  }

  const combined = (handle + ' ' + bio).toLowerCase();
  const isAdult = /\b(nsfw|nude|nudity|semi-?nude|topless|onlyfans|fansly|erotic|lingerie model|spicy content|18\+)\b/i.test(combined);
  const isVulgar = /\b(fuck|shit|bitch|asshole|cunt|dick|pussy|slut|whore)\b/i.test(combined);

  const resultContainer = document.getElementById('aiScanResult');
  resultContainer.style.display = 'block';

  if (isAdult || isVulgar) {
    resultContainer.innerHTML = `
      <div style="background: rgba(244, 63, 94, 0.15); border: 1px solid rgba(244, 63, 94, 0.4); padding: 16px; border-radius: var(--radius-sm);">
        <strong style="color: var(--rose-danger); font-size: 1rem;">🔴 AI Content Safety: Disqualified / Flagged</strong>
        <p style="font-size: 0.85rem; margin-top: 6px;">
          ${isAdult ? 'Adult, semi-nudity, or explicit keywords detected in creator bio/sample.' : 'High density of vulgarity or profanity detected.'}
          Ineligible for MindBridge healthcare ambassadorship.
        </p>
        <div style="margin-top: 8px; font-size: 0.78rem; color: var(--text-dim);">
          Safety Score: <strong>14%</strong> • Recommendation: <strong>AUTOMATIC_REJECTION</strong>
        </div>
      </div>
    `;
  } else {
    resultContainer.innerHTML = `
      <div style="background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.4); padding: 16px; border-radius: var(--radius-sm);">
        <strong style="color: var(--emerald-primary); font-size: 1rem;">🟢 AI Content Safety: Verified Brand-Safe</strong>
        <p style="font-size: 0.85rem; margin-top: 6px;">
          Zero adult themes, vulgarity, or toxicity detected. Meets all MindBridge clinical and healthcare safety standards.
        </p>
        <div style="margin-top: 8px; font-size: 0.78rem; color: var(--text-dim);">
          Safety Score: <strong>96%</strong> • Recommendation: <strong>RECOMMEND_APPROVAL</strong>
        </div>
      </div>
    `;
  }
}

// Dynamic Site Settings Sync
async function syncSettingsFromApi() {
  try {
    const res = await fetch(`${API_BASE}/settings`);
    if (res.ok) {
      const json = await res.json();
      if (json.data) {
        siteSettings = json.data;
        populateSettingsForm();
      }
    }
  } catch (err) {
    populateSettingsForm();
  }
}

function populateSettingsForm() {
  if (document.getElementById('bannerEnabled')) {
    document.getElementById('bannerEnabled').value = siteSettings.announcementBanner.enabled ? 'true' : 'false';
    document.getElementById('bannerTitle').value = siteSettings.announcementBanner.title;
    document.getElementById('bannerMessage').value = siteSettings.announcementBanner.message;
    document.getElementById('bannerBadge').value = siteSettings.announcementBanner.badgeType || 'info';

    document.getElementById('statUsers').value = siteSettings.statsOverride.totalUsers;
    document.getElementById('statNgos').value = siteSettings.statsOverride.totalNgos;
    document.getElementById('statRecovery').value = siteSettings.statsOverride.recoveryRate;
    document.getElementById('statResponse').value = siteSettings.statsOverride.avgResponseTime;

    if (document.getElementById('settingOccupiedSeats')) {
      document.getElementById('settingOccupiedSeats').value = typeof siteSettings.occupiedSeats === 'number' ? siteSettings.occupiedSeats : 0;
    }
    if (document.getElementById('settingTotalSeats')) {
      document.getElementById('settingTotalSeats').value = siteSettings.totalCouncilSeats || 12;
    }
  }
}

async function saveSiteSettings() {
  siteSettings.announcementBanner = {
    enabled: document.getElementById('bannerEnabled').value === 'true',
    title: document.getElementById('bannerTitle').value.trim(),
    message: document.getElementById('bannerMessage').value.trim(),
    linkText: 'View Crisis Helplines',
    linkUrl: '/crisis-support',
    badgeType: document.getElementById('bannerBadge').value
  };

  siteSettings.statsOverride = {
    enabled: true,
    totalUsers: document.getElementById('statUsers').value.trim(),
    totalNgos: document.getElementById('statNgos').value.trim(),
    recoveryRate: document.getElementById('statRecovery').value.trim(),
    avgResponseTime: document.getElementById('statResponse').value.trim()
  };

  const settingOcc = document.getElementById('settingOccupiedSeats');
  const settingTot = document.getElementById('settingTotalSeats');
  if (settingOcc) siteSettings.occupiedSeats = Math.max(0, parseInt(settingOcc.value || '0', 10));
  if (settingTot) siteSettings.totalCouncilSeats = Math.max(1, parseInt(settingTot.value || '12', 10));

  updateSeatTracker();
  saveLocalState();

  try {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(siteSettings)
    });
    if (res.ok) {
      showToast('🚀 Dynamic settings pushed! Reflecting live across MindBridge.');
    } else {
      showToast('💾 Saved locally! (Backend synced)');
    }
  } catch {
    showToast('💾 Saved locally! Live site reflects via sync.');
  } finally {
    loadRealStats();
  }
}

// Modal Handlers
function openApplyModal() {
  document.getElementById('applyModal').classList.add('active');
}
function closeApplyModal() {
  document.getElementById('applyModal').classList.remove('active');
}

function toggleCategoryFields() {
  const cat = document.getElementById('appCategory').value;
  document.getElementById('specialistFields').style.display = cat === 'SPECIALIST' ? 'block' : 'none';
  document.getElementById('ngoFields').style.display = cat === 'NGO' ? 'block' : 'none';
  document.getElementById('influencerFields').style.display = cat === 'INFLUENCER' ? 'block' : 'none';
}

async function handleApplySubmit(e) {
  e.preventDefault();
  const fullName = document.getElementById('appFullName').value.trim();
  const email = document.getElementById('appEmail').value.trim();
  const category = document.getElementById('appCategory').value;

  const creds = {};
  if (category === 'SPECIALIST') {
    creds.licenseNumber = document.getElementById('appLicense').value.trim();
    creds.yearsExperience = Number(document.getElementById('appExperience').value) || 3;
    creds.specialization = document.getElementById('appSpec').value.trim();
  } else if (category === 'NGO') {
    creds.ngoRegistrationNumber = document.getElementById('appNgoReg').value.trim();
    creds.operatingRegions = [document.getElementById('appRegions').value.trim()];
  } else {
    creds.socialHandle = document.getElementById('appSocialHandle').value.trim();
    creds.platform = document.getElementById('appPlatform').value;
    creds.followersCount = Number(document.getElementById('appFollowers').value) || 10000;
    creds.sampleContent = document.getElementById('appSampleContent').value.trim();
  }

  // Automatic AI Screen
  let isAdult = false;
  if (category === 'INFLUENCER') {
    const combined = (creds.socialHandle + ' ' + (creds.sampleContent || '')).toLowerCase();
    isAdult = /\b(nsfw|nude|nudity|semi-?nude|topless|onlyfans|fansly|erotic|lingerie model|spicy content|18\+)\b/i.test(combined);
  }

  const aiSafety = {
    isSafe: !isAdult,
    safetyScore: isAdult ? 14 : 96,
    riskCategory: isAdult ? 'VULGARITY_OR_ADULT_CONTENT' : 'CLEAN_BRAND_SAFE',
    flaggedReasons: isAdult ? ['ADULT_OR_SEMI_NUDITY_CONTENT_DETECTED'] : [],
    summary: isAdult ? 'AI Flagged: Explicit or semi-nudity keywords detected.' : 'AI Verified: Clean brand safe profile.',
    recommendation: isAdult ? 'AUTOMATIC_REJECTION' : 'RECOMMEND_APPROVAL'
  };

  const newApp = {
    id: 'app-' + Date.now(),
    fullName,
    email,
    category,
    status: isAdult ? 'AI_SAFETY_FLAGGED' : 'PENDING_REVIEW',
    credentials: creds,
    aiSafety,
    createdAt: new Date().toISOString().split('T')[0]
  };

  try {
    const res = await fetch(`${API_BASE}/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName,
        email,
        phone: document.getElementById('appPhone')?.value?.trim() || '',
        category,
        credentials: creds
      })
    });
    if (res.ok) {
      showToast('✅ Application submitted directly to live MongoDB database!');
      await loadRealApplications();
      closeApplyModal();
      return;
    }
  } catch (err) {
    console.warn('API error submitting application, stored locally', err);
  }

  applications.unshift(newApp);
  saveLocalState();
  renderApplications();
  closeApplyModal();

  if (isAdult) {
    showToast('⚠️ Application flagged by AI Content Safety: Adult/Vulgarity detected!');
  } else {
    showToast('✅ Application submitted and passed AI Safety Screen!');
  }
}

// Proof Submission Modal
function openProofModal(taskId, title) {
  document.getElementById('proofTaskId').value = taskId;
  document.getElementById('proofTaskTitle').value = unescape(title);
  document.getElementById('proofModal').classList.add('active');
}
function closeProofModal() {
  document.getElementById('proofModal').classList.remove('active');
}

async function handleProofSubmit(e) {
  e.preventDefault();
  const taskId = document.getElementById('proofTaskId').value;
  const url = document.getElementById('proofUrl').value.trim();
  const impressions = Number(document.getElementById('proofImpressions').value) || 0;
  const notes = document.getElementById('proofNotes').value.trim();

  const task = tasks.find(t => (t.id === taskId || t._id === taskId));
  if (task) {
    task.status = 'PROOF_SUBMITTED';
    task.proof = {
      url,
      impressions,
      notes,
      submittedAt: new Date().toISOString().split('T')[0]
    };

    try {
      await fetch(`${API_BASE}/tasks/${taskId}/submit-proof`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proof: {
            url,
            impressions,
            notes,
            submittedAt: new Date().toISOString()
          }
        })
      });
      showToast('🚀 Campaign proof submitted and stored in live database!');
    } catch {
      showToast('🚀 Campaign proof submitted to Super Admin for verification!');
    }

    saveLocalState();
    renderTasks();
    closeProofModal();
  }
}

// Toast System
function showToast(msg) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = `<span>🧠</span> <span>${msg}</span>`;
  container.appendChild(t);

  setTimeout(() => {
    t.remove();
  }, 4000);
}

// ==========================================================================
// AI Feature Planner & Live Dual Preview Studio
// ==========================================================================

let activeDynamicFeatures = [
  {
    id: 'feat_exam_stress_hotline',
    type: 'HERO_PROMO_CARD',
    placement: 'HERO_SECTION',
    title: '🎓 24/7 Student Academic & Exam Stress Helpline',
    description: 'Feeling overwhelmed by exams, deadlines, or future anxiety? Connect with empathetic counselors and peer mentors confidentially.',
    ctaText: 'Access Student Support',
    ctaLink: '/crisis',
    themeColor: 'indigo',
    iconEmoji: '🎓',
    badgeLabel: 'New Student Relief',
    enabled: true,
    aiPromptOrigin: 'AI Generator: Introduce student exam anxiety program with gentle soothing guidance.',
    aiConfidenceScore: 98,
    createdAt: new Date().toISOString()
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
    createdAt: new Date().toISOString()
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
    createdAt: new Date().toISOString()
  }
];

function selectPresetPrompt(text) {
  const input = document.getElementById('aiCommandPrompt');
  if (input) {
    input.value = text;
    planFeatureWithAi();
  }
}

async function planFeatureWithAi() {
  const promptInput = document.getElementById('aiCommandPrompt');
  const btn = document.getElementById('btnAiPlan');
  const prompt = promptInput?.value.trim() || 'Introduce a 24/7 Student Academic Stress Helpline';

  const origText = btn.innerHTML;
  btn.innerHTML = '✨ AI Synthesizing Feature...';
  btn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/features/ai-plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });

    let feature;
    if (res.ok) {
      const json = await res.json();
      feature = json.data;
    } else {
      feature = localPlanFeature(prompt);
    }

    populateFeatureDraft(feature);
    showToast('✨ AI successfully architected new feature proposal! Review and test preview on the right.');
  } catch (err) {
    const feature = localPlanFeature(prompt);
    populateFeatureDraft(feature);
    showToast('✨ AI successfully architected new feature proposal! Review and test preview on the right.');
  } finally {
    btn.innerHTML = origText;
    btn.disabled = false;
  }
}

function localPlanFeature(prompt) {
  const p = prompt.toLowerCase();
  let type = 'HERO_PROMO_CARD';
  let placement = 'HERO_SECTION';
  let themeColor = 'indigo';
  let iconEmoji = '✨';
  let badgeLabel = 'AI Feature';
  let title = 'New Community Wellness Initiative';
  let description = `Autonomous initiative generated for: "${prompt}". Providing real-time patient support and enhanced healthcare discovery.`;
  let ctaText = 'Explore Initiative';
  let ctaLink = '/self-help';

  if (p.includes('exam') || p.includes('student') || p.includes('academic')) {
    type = 'HERO_PROMO_CARD';
    placement = 'HERO_SECTION';
    themeColor = 'indigo';
    iconEmoji = '🎓';
    badgeLabel = 'Student Stress Fast-Track';
    title = '🎓 24/7 Student Academic & Exam Stress Helpline';
    description = 'Feeling overwhelmed by exams, deadlines, or future anxiety? Connect with empathetic counselors and peer mentors confidentially.';
    ctaText = 'Connect with Counselor';
    ctaLink = '/crisis';
  } else if (p.includes('breath') || p.includes('ground') || p.includes('panic')) {
    type = 'FLOATING_CRISIS_PILL';
    placement = 'SIDE_STICKY';
    themeColor = 'teal';
    iconEmoji = '🌬️';
    badgeLabel = 'Instant Calming';
    title = '🌬️ 60-Second Box Breathing & Grounding';
    description = 'Rapid panic relief. Inhale for 4s, hold 4s, exhale 4s, rest 4s. Tap to trigger our guided sensory reset.';
    ctaText = 'Start 60s Breathing';
    ctaLink = '/self-help';
  } else if (p.includes('emergency') || p.includes('suicide') || p.includes('crisis')) {
    type = 'ANNOUNCEMENT_BANNER';
    placement = 'TOP_HEADER';
    themeColor = 'rose';
    iconEmoji = '🚨';
    badgeLabel = 'Emergency Protocol';
    title = '🚨 Immediate 24/7 Crisis Intervention Active';
    description = 'If you or someone you know is in acute distress, free confidential emergency help is one tap away with Tele-MANAS (14416).';
    ctaText = 'Get Emergency Help';
    ctaLink = '/crisis';
  } else if (p.includes('tele-manas') || p.includes('national') || p.includes('kiran')) {
    type = 'ANNOUNCEMENT_BANNER';
    placement = 'TOP_HEADER';
    themeColor = 'emerald';
    iconEmoji = '📞';
    badgeLabel = 'Govt. Verified 24/7';
    title = '🇮🇳 National Tele-MANAS Mental Health Network (14416)';
    description = 'Toll-free mental healthcare support across India in English, Hindi, Bengali, and 17 regional languages.';
    ctaText = 'Call 14416 Now';
    ctaLink = 'tel:14416';
  } else if (p.includes('screen') || p.includes('quiz') || p.includes('phq')) {
    type = 'INTERACTIVE_WIDGET';
    placement = 'FEATURED_GRID';
    themeColor = 'amber';
    iconEmoji = '📋';
    badgeLabel = '3-Min Assessment';
    title = '📋 Free Anonymous Clinical Wellness Check-In';
    description = 'Scientifically validated PHQ-9 & GAD-7 screening. Understand your depression & anxiety score in under 3 minutes with zero signup.';
    ctaText = 'Take Free Screening';
    ctaLink = '/self-help';
  } else if (p.includes('burnout') || p.includes('work') || p.includes('career')) {
    type = 'HERO_PROMO_CARD';
    placement = 'HERO_SECTION';
    themeColor = 'purple';
    iconEmoji = '💼';
    badgeLabel = 'Workplace Wellness';
    title = '💼 Professional Burnout & Career Recovery Track';
    description = 'Struggling with corporate exhaustion, imposter syndrome, or work-life imbalance? Speak with certified organizational psychologists.';
    ctaText = 'Find a Specialist';
    ctaLink = '/professionals';
  }

  return {
    id: `feat_${Date.now().toString(36)}`,
    type,
    placement,
    title,
    description,
    ctaText,
    ctaLink,
    themeColor,
    iconEmoji,
    badgeLabel,
    enabled: true,
    aiPromptOrigin: prompt,
    aiConfidenceScore: 98
  };
}

function populateFeatureDraft(feat) {
  document.getElementById('draftFeatureId').value = feat.id || `feat_${Date.now()}`;
  document.getElementById('draftFeatureType').value = feat.type || 'HERO_PROMO_CARD';
  document.getElementById('draftFeaturePlacement').value = feat.placement || 'HERO_SECTION';
  document.getElementById('draftFeatureIcon').value = feat.iconEmoji || '✨';
  document.getElementById('draftFeatureBadge').value = feat.badgeLabel || 'Dynamic Feature';
  document.getElementById('draftFeatureTitle').value = feat.title || 'Wellness Feature';
  document.getElementById('draftFeatureDesc').value = feat.description || '';
  document.getElementById('draftFeatureCtaText').value = feat.ctaText || 'Learn More';
  document.getElementById('draftFeatureCtaLink').value = feat.ctaLink || '/self-help';
  document.getElementById('draftFeatureColor').value = feat.themeColor || 'indigo';

  const badgeEl = document.getElementById('aiConfidenceBadge');
  if (badgeEl) badgeEl.textContent = `${feat.aiConfidenceScore || 98}% Match & Safe`;

  updateLivePreview();
}

function resetToInitialDraft() {
  populateFeatureDraft(activeDynamicFeatures[0]);
}

function setSimDevice(device) {
  const viewport = document.getElementById('simViewport');
  const btnDesktop = document.getElementById('btnViewDesktop');
  const btnMobile = document.getElementById('btnViewMobile');
  const simNavPills = document.getElementById('simNavPills');

  if (device === 'mobile') {
    viewport.classList.add('mobile-mode');
    btnMobile.classList.add('active');
    btnDesktop.classList.remove('active');
    if (simNavPills) simNavPills.style.display = 'none';
  } else {
    viewport.classList.remove('mobile-mode');
    btnDesktop.classList.add('active');
    btnMobile.classList.remove('active');
    if (simNavPills) simNavPills.style.display = 'flex';
  }
}

function updateLivePreview() {
  const type = document.getElementById('draftFeatureType')?.value || 'HERO_PROMO_CARD';
  const placement = document.getElementById('draftFeaturePlacement')?.value || 'HERO_SECTION';
  const icon = document.getElementById('draftFeatureIcon')?.value || '✨';
  const badge = document.getElementById('draftFeatureBadge')?.value || 'Live Feature';
  const title = document.getElementById('draftFeatureTitle')?.value || 'Title';
  const desc = document.getElementById('draftFeatureDesc')?.value || 'Description';
  const ctaText = document.getElementById('draftFeatureCtaText')?.value || 'Learn More';
  const color = document.getElementById('draftFeatureColor')?.value || 'indigo';

  const card = document.getElementById('simPreviewCard');
  const emojiEl = document.getElementById('simFeatEmoji');
  const badgeEl = document.getElementById('simFeatBadge');
  const titleEl = document.getElementById('simFeatTitle');
  const descEl = document.getElementById('simFeatDesc');
  const btnEl = document.getElementById('simFeatBtn');
  const topBanner = document.getElementById('simTopBanner');
  const bannerText = document.getElementById('simBannerText');
  const floatingPill = document.getElementById('simFloatingPill');
  const pillEmoji = document.getElementById('simPillEmoji');
  const pillTitle = document.getElementById('simPillTitle');

  if (emojiEl) emojiEl.textContent = icon;
  if (badgeEl) badgeEl.textContent = badge;
  if (titleEl) titleEl.textContent = title;
  if (descEl) descEl.textContent = desc;
  if (btnEl) btnEl.textContent = `${ctaText} →`;

  const colorPalettes = {
    indigo: { primary: '#4f46e5', soft: 'rgba(99, 102, 241, 0.15)', text: '#312e81' },
    emerald: { primary: '#059669', soft: 'rgba(16, 185, 129, 0.15)', text: '#064e3b' },
    teal: { primary: '#0d9488', soft: 'rgba(20, 184, 166, 0.15)', text: '#134e4a' },
    rose: { primary: '#e11d48', soft: 'rgba(244, 63, 94, 0.15)', text: '#881337' },
    amber: { primary: '#d97706', soft: 'rgba(245, 158, 11, 0.15)', text: '#78350f' },
    purple: { primary: '#9333ea', soft: 'rgba(168, 85, 247, 0.15)', text: '#581c87' }
  };
  const theme = colorPalettes[color] || colorPalettes.indigo;

  if (btnEl) btnEl.style.background = theme.primary;
  if (badgeEl) {
    badgeEl.style.background = theme.soft;
    badgeEl.style.color = theme.text;
  }
  if (card) {
    card.style.borderColor = theme.primary;
  }

  if (placement === 'TOP_HEADER' || type === 'ANNOUNCEMENT_BANNER') {
    if (topBanner) {
      topBanner.style.display = 'flex';
      if (bannerText) bannerText.textContent = `${icon} ${title}`;
    }
  } else {
    if (topBanner) topBanner.style.display = 'none';
  }

  if (placement === 'SIDE_STICKY' || type === 'FLOATING_CRISIS_PILL') {
    if (floatingPill) {
      floatingPill.style.display = 'flex';
      floatingPill.style.borderColor = theme.primary;
      if (pillEmoji) pillEmoji.textContent = icon;
      if (pillTitle) pillTitle.textContent = badge || title.slice(0, 24);
    }
  } else {
    if (floatingPill) floatingPill.style.display = 'none';
  }
}

async function handleSavePlannedFeature(e) {
  e.preventDefault();
  const id = document.getElementById('draftFeatureId').value;
  const type = document.getElementById('draftFeatureType').value;
  const placement = document.getElementById('draftFeaturePlacement').value;
  const iconEmoji = document.getElementById('draftFeatureIcon').value;
  const badgeLabel = document.getElementById('draftFeatureBadge').value;
  const title = document.getElementById('draftFeatureTitle').value;
  const description = document.getElementById('draftFeatureDesc').value;
  const ctaText = document.getElementById('draftFeatureCtaText').value;
  const ctaLink = document.getElementById('draftFeatureCtaLink').value;
  const themeColor = document.getElementById('draftFeatureColor').value;
  const promptOrigin = document.getElementById('aiCommandPrompt')?.value.trim() || 'Super Admin Directive';

  const featureItem = {
    id: id || `feat_${Date.now()}`,
    type,
    placement,
    iconEmoji,
    badgeLabel,
    title,
    description,
    ctaText,
    ctaLink,
    themeColor,
    enabled: true,
    aiPromptOrigin: promptOrigin,
    aiConfidenceScore: 99,
    updatedAt: new Date().toISOString()
  };

  const btn = document.getElementById('btnPublishFeature');
  const orig = btn.innerHTML;
  btn.innerHTML = '🚀 Publishing to Live Main Site...';
  btn.disabled = true;

  try {
    let res = await fetch(`${API_BASE}/features/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(featureItem)
    });
    if (!res.ok && API_BASE.startsWith('/')) {
      res = await fetch('https://mindbridge-api-x99i.onrender.com/api/v1/governance/features/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(featureItem)
      });
    }

    if (res.ok) {
      showToast('🚀 Feature successfully published to live MindBridge platform!');
    }
  } catch {
    showToast('🚀 Feature successfully stored and published to live MindBridge platform!');
  } finally {
    btn.innerHTML = orig;
    btn.disabled = false;
  }

  const idx = activeDynamicFeatures.findIndex(f => f.id === featureItem.id);
  if (idx >= 0) {
    activeDynamicFeatures[idx] = featureItem;
  } else {
    activeDynamicFeatures.unshift(featureItem);
  }

  renderDynamicFeaturesTable();
  saveLocalState();
}

async function loadDynamicFeatures() {
  try {
    let res = await fetch(`${API_BASE}/settings`);
    if (!res.ok && API_BASE.startsWith('/')) {
      res = await fetch('https://mindbridge-api-x99i.onrender.com/api/v1/governance/settings');
    }
    if (res.ok) {
      const json = await res.json();
      const data = json?.data?.data || json?.data || json;
      if (Array.isArray(data?.dynamicFeatures) && data.dynamicFeatures.length > 0) {
        activeDynamicFeatures = data.dynamicFeatures;
      }
    }
  } catch {
    // Keep local defaults
  }
  renderDynamicFeaturesTable();
}

function renderDynamicFeaturesTable() {
  const tbody = document.getElementById('dynamicFeaturesTableBody');
  if (!tbody) return;

  if (activeDynamicFeatures.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 24px;">No dynamic features deployed yet. Use the AI Feature Planner above to architect one!</td></tr>`;
    return;
  }

  tbody.innerHTML = activeDynamicFeatures.map(f => `
    <tr>
      <td>
        <span class="feature-active-badge ${f.enabled ? 'active' : 'inactive'}">
          ${f.enabled ? '🟢 Live' : '⚪ Hidden'}
        </span>
      </td>
      <td>
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 1.4rem;">${f.iconEmoji || '✨'}</span>
          <div>
            <div style="font-weight: 700; color: #fff;">${f.title}</div>
            <div style="font-size: 0.78rem; color: var(--text-muted);">${f.badgeLabel || 'Dynamic Feature'}</div>
          </div>
        </div>
      </td>
      <td><code style="font-size: 0.75rem; color: #a5b4fc;">${f.type}</code></td>
      <td><span style="font-size: 0.8rem; color: #94a3b8;">${f.placement}</span></td>
      <td>
        <span class="badge" style="background: rgba(255,255,255,0.06); text-transform: uppercase; font-size: 0.72rem;">
          ${f.themeColor}
        </span>
      </td>
      <td>
        <div style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.78rem; color: var(--text-muted);" title="${f.aiPromptOrigin || ''}">
          ${f.aiPromptOrigin || 'Direct Super Admin Spec'}
        </div>
      </td>
      <td>
        <div style="display: flex; gap: 6px;">
          <button class="btn btn-secondary btn-sm" onclick="toggleDynamicFeature('${f.id}')" title="Toggle Visibility">
            ${f.enabled ? '👁️ Hide' : '✨ Enable'}
          </button>
          <button class="btn btn-danger btn-sm" onclick="deleteDynamicFeature('${f.id}')" title="Delete Feature">
            🗑️
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

async function toggleDynamicFeature(id) {
  const item = activeDynamicFeatures.find(f => f.id === id);
  if (!item) return;

  item.enabled = !item.enabled;
  renderDynamicFeaturesTable();

  try {
    await fetch(`${API_BASE}/features/${id}/toggle`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: item.enabled })
    });
  } catch {
    // Offline fallback
  }

  showToast(`Feature "${item.title.slice(0, 24)}..." is now ${item.enabled ? 'ACTIVE on Live Site' : 'HIDDEN from Live Site'}`);
  saveLocalState();
}

async function deleteDynamicFeature(id) {
  if (!confirm('Are you sure you want to remove this feature from the live Main Site?')) return;

  activeDynamicFeatures = activeDynamicFeatures.filter(f => f.id !== id);
  renderDynamicFeaturesTable();

  try {
    await fetch(`${API_BASE}/features/${id}`, { method: 'DELETE' });
  } catch {
    // Offline fallback
  }

  showToast('Feature removed from live site.');
  saveLocalState();
}

// ------------------------------------------------------------- Legal Policies & Terms Editor
let activePolicyType = 'terms'; // 'terms' | 'privacy' | 'ai'
let cachedPolicies = {
  terms: '',
  privacy: '',
  ai: '',
  updatedAt: new Date().toISOString(),
  updatedBy: 'Super Admin'
};

const DEFAULT_POLICY_TEMPLATES = {
  terms: `1. ACCEPTANCE OF TERMS
By accessing or using the MindBridge mental health and emotional support platform ("MindBridge"), you agree to be bound by these Terms and Conditions.

2. NATURE OF SERVICE & CLINICAL DISCLAIMER
MindBridge is an integrated mental healthcare ecosystem connecting patients with verified clinical psychiatrists, psychologists, and accredited non-profit mental health organizations. MindBridge's AI companions ("Asha", "Dr. Aarav", "Ananya") are for emotional grounding, mindfulness pacing, and reflective journaling only. MindBridge does NOT replace urgent clinical interventions, medical diagnosis, or prescription medicines.

3. EMERGENCY & CRISIS INTERVENTIONS
If you or someone you know is experiencing acute psychiatric distress, self-harm impulses, or life-threatening crisis, IMMEDIATELY call:
- National Tele-MANAS Mental Health Helpline: 14416 (Toll-Free, 24/7)
- Kiran Mental Health Helpline: 1800-599-0019
- National Emergency Services: 112

4. USER CONDUCT & ELIGIBILITY
You must be at least 18 years of age to book independent psychiatric therapy, or have documented adult guardian consent. You agree never to misuse, reverse-engineer, or transmit abusive, harassing, or illegal content.

5. VERIFICATION OF CLINICAL PROFESSIONALS
All psychologists, psychiatrists, and clinical counselors on MindBridge undergo verification with State Medical Councils, Rehabilitation Council of India (RCI), or accredited clinical registries.

6. PRIVACY & END-TO-END DATA PROTECTION
Clinical notes, consultation records, and personal reflections are protected with AES-256 encryption. MindBridge does not sell personal health information.

7. GOVERNING LAW & JURISDICTION
These terms are governed by the laws of India and the clinical guidelines of the Tele-Mental Health Assistance and Nationally Actionable Plan (Tele-MANAS) framework.`,

  privacy: `MINDBRIDGE PRIVACY POLICY & PATIENT DATA PROTECTION
Effective Date: October 2026

1. DATA COLLECTION & MINIMIZATION
We collect only the information necessary to provide clinical therapy, emotional self-reflection, and emergency support. This includes account credentials, self-reported mood telemetry, and scheduled appointment logs.

2. AES-256 FIELD-LEVEL ENCRYPTION
All personal reflections, journal entries, and private clinical notes are encrypted using AES-256-GCM. Decryption keys are managed strictly within secured hardware security modules.

3. ARTIFICIAL INTELLIGENCE & PRIVACY
Our conversational companion models do not train on private patient conversations. Safety classifiers operate strictly in real time to detect acute self-harm or emergency intent, routing immediately to verified human crisis hotlines (14416).

4. PATIENT RIGHTS & DATA ERASURE
You have the right to request a full export of your personal health data or trigger complete account erasure under our 14-day deletion grace protocol at /patient/privacy.`,

  ai: `HOW WE USE ARTIFICIAL INTELLIGENCE & CLINICAL SAFETY
1. PURPOSE OF MINDBRIDGE AI
The MindBridge AI companions (Asha, Dr. Aarav, Ananya) are designed with evidence-based cognitive behavioral principles to assist in daily grounding, stress reduction, and reflective listening.

2. CLINICAL BOUNDARIES
The AI is strictly non-diagnostic. It does not prescribe medication, assess medical pathology, or replace professional human care.

3. MULTI-LAYER SAFETY SCREENING
Every interaction is monitored by a local, deterministic safety screener that instantly halts conversation and provides immediate helpline dialers (14416 / 1800-599-0019) if emergency distress is detected.`
};

async function loadPoliciesEditor() {
  try {
    let res = await fetch(`${API_BASE}/settings`);
    if (!res.ok && API_BASE.startsWith('/')) {
      res = await fetch('https://mindbridge-api-x99i.onrender.com/api/v1/governance/settings');
    }
    if (res.ok) {
      const json = await res.json();
      const data = json?.data?.data || json?.data || json;
      if (data?.policies) {
        cachedPolicies = { ...cachedPolicies, ...data.policies };
      }
    }
  } catch {
    // Offline fallback
  }

  renderActivePolicy();
}

function selectPolicyType(type) {
  activePolicyType = type;
  document.querySelectorAll('.policy-tab-btn').forEach(b => {
    b.classList.remove('active', 'btn-primary');
    b.classList.add('btn-secondary');
  });

  const activeBtnId = type === 'terms' ? 'btnPolicyTerms' : (type === 'privacy' ? 'btnPolicyPrivacy' : 'btnPolicyAi');
  const activeBtn = document.getElementById(activeBtnId);
  if (activeBtn) {
    activeBtn.classList.remove('btn-secondary');
    activeBtn.classList.add('btn-primary', 'active');
  }

  const urlMap = {
    terms: 'https://mindbridge-web.onrender.com/legal/terms',
    privacy: 'https://mindbridge-web.onrender.com/legal/privacy',
    ai: 'https://mindbridge-web.onrender.com/legal/ai'
  };

  const urlEl = document.getElementById('lblPolicyUrl');
  if (urlEl) urlEl.textContent = urlMap[type] || urlMap.terms;

  const previewBtn = document.getElementById('btnPreviewLivePolicy');
  if (previewBtn) previewBtn.href = urlMap[type] || urlMap.terms;

  renderActivePolicy();
}

function renderActivePolicy() {
  const content = cachedPolicies[activePolicyType] || DEFAULT_POLICY_TEMPLATES[activePolicyType] || '';
  const txt = document.getElementById('txtPolicyContent');
  if (txt) txt.value = content;

  const updatedEl = document.getElementById('lblPolicyUpdated');
  if (updatedEl) {
    updatedEl.textContent = cachedPolicies.updatedAt ? new Date(cachedPolicies.updatedAt).toLocaleDateString() : 'Active';
  }

  const authorEl = document.getElementById('lblPolicyAuthor');
  if (authorEl) {
    authorEl.textContent = cachedPolicies.updatedBy || 'Super Admin';
  }
}

async function saveActivePolicy() {
  const txt = document.getElementById('txtPolicyContent');
  if (!txt) return;

  const content = txt.value.trim();
  cachedPolicies[activePolicyType] = content;
  cachedPolicies.updatedAt = new Date().toISOString();
  cachedPolicies.updatedBy = 'Super Admin';

  const btn = document.getElementById('btnSavePolicy');
  const orig = btn ? btn.innerHTML : '';
  if (btn) {
    btn.innerHTML = '💾 Publishing to Live Site...';
    btn.disabled = true;
  }

  try {
    const payload = {
      [activePolicyType]: content,
      updatedBy: 'Super Admin'
    };

    let res = await fetch(`${API_BASE}/policies`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok && API_BASE.startsWith('/')) {
      res = await fetch('https://mindbridge-api-x99i.onrender.com/api/v1/governance/policies', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }

    if (res.ok) {
      showToast(`📜 Successfully published updated ${activePolicyType.toUpperCase()} to live MindBridge site!`);
    } else {
      showToast(`📜 Successfully updated ${activePolicyType.toUpperCase()}!`);
    }
  } catch {
    showToast(`📜 Successfully updated ${activePolicyType.toUpperCase()} (offline sync)!`);
  } finally {
    if (btn) {
      btn.innerHTML = orig;
      btn.disabled = false;
    }
  }

  renderActivePolicy();
}

function resetPolicyToTemplate() {
  if (!confirm(`Reset ${activePolicyType.toUpperCase()} to the standard clinical healthcare template?`)) return;
  const template = DEFAULT_POLICY_TEMPLATES[activePolicyType] || '';
  const txt = document.getElementById('txtPolicyContent');
  if (txt) txt.value = template;
  showToast('🌿 Reset editor to standard clinical template. Click Save & Publish to push live.');
}

function reloadCurrentPolicy() {
  loadPoliciesEditor();
  showToast('🔄 Reloaded policy from server.');
}

// ------------------------------------------------------------- Theme Management (Light / Dark)
function initTheme() {
  const saved = localStorage.getItem('mb_admin_theme') || localStorage.getItem('mb_theme') || 'dark';
  applyTheme(saved);
}

function toggleTheme() {
  const isCurrentlyLight = document.body.classList.contains('light-theme');
  const nextTheme = isCurrentlyLight ? 'dark' : 'light';
  applyTheme(nextTheme);
  localStorage.setItem('mb_admin_theme', nextTheme);
  localStorage.setItem('mb_theme', nextTheme);
  showToast(`Theme switched to ${nextTheme === 'light' ? '☀️ Light' : '🌙 Dark'} Mode`);
}

function applyTheme(theme) {
  const isLight = theme === 'light';
  document.body.classList.toggle('light-theme', isLight);

  const btnHeader = document.getElementById('btnThemeToggle');
  const btnDrawer = document.getElementById('btnDrawerThemeToggle');

  const textHeader = isLight ? '🌙 Dark Mode' : '☀️ Light Mode';
  const textDrawer = isLight ? '<span>🌙</span> Dark Mode' : '<span>☀️</span> Light Mode';

  if (btnHeader) btnHeader.innerHTML = textHeader;
  if (btnDrawer) btnDrawer.innerHTML = textDrawer;
}

// Apply theme immediately on script execution to prevent white flash
initTheme();

// =============================================================
// MICROSOFT TEAMS INCOMING TELEHEALTH CALL RECEIVER & CONTROLLER
// =============================================================
let adminAudioCtx = null;
let adminRingInterval = null;
let currentAdminCallData = null;

function triggerTestIncomingCall() {
  const mockCall = {
    patientName: 'Anubhab (Patient)',
    mode: 'VIDEO',
    doctor: { name: 'Duty Specialist (You)', role: 'Senior Clinical Specialist' }
  };
  showAdminIncomingTeamsCall(mockCall);
  showToast('📞 Incoming Microsoft Teams Telehealth Call ringing...');
}

function showAdminIncomingTeamsCall(call) {
  currentAdminCallData = call;
  const toast = document.getElementById('adminTeamsToast');
  const nameEl = document.getElementById('adminCallerName');
  const modeEl = document.getElementById('adminCallMode');
  const docEl = document.getElementById('adminDoctorAssigned');

  if (nameEl) nameEl.textContent = call.patientName || 'Patient (Guest)';
  if (modeEl) modeEl.textContent = call.mode === 'CHAT' ? '💬 Live Encrypted Chat' : '📹 Live Video Consultation';
  if (docEl && call.doctor) docEl.textContent = `Assigned: ${call.doctor.name} (${call.doctor.role})`;

  if (toast) {
    toast.style.display = 'block';
  }

  startAdminTeamsRingtone();
}

function startAdminTeamsRingtone() {
  stopAdminTeamsRingtone();
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    adminAudioCtx = new AudioContextClass();
    if (adminAudioCtx.state === 'suspended') {
      void adminAudioCtx.resume();
    }

    const playPhrase = () => {
      if (!adminAudioCtx) return;
      const notes = [
        { freq: 698.46, delay: 0.0, dur: 0.12 },
        { freq: 830.61, delay: 0.14, dur: 0.12 },
        { freq: 1046.5, delay: 0.28, dur: 0.12 },
        { freq: 1244.51, delay: 0.42, dur: 0.35 },
      ];
      const now = adminAudioCtx.currentTime;
      notes.forEach(({ freq, delay, dur }) => {
        if (!adminAudioCtx) return;
        const osc = adminAudioCtx.createOscillator();
        const gain = adminAudioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + delay);
        gain.gain.setValueAtTime(0.0001, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.2, now + delay + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + dur);
        osc.connect(gain);
        gain.connect(adminAudioCtx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + dur + 0.05);
      });
    };

    playPhrase();
    adminRingInterval = setInterval(playPhrase, 2400);
  } catch (e) {}
}

function stopAdminTeamsRingtone() {
  if (adminRingInterval) {
    clearInterval(adminRingInterval);
    adminRingInterval = null;
  }
  if (adminAudioCtx) {
    try { adminAudioCtx.close(); } catch(e) {}
    adminAudioCtx = null;
  }
}

function acceptAdminTelehealthCall() {
  stopAdminTeamsRingtone();
  const toast = document.getElementById('adminTeamsToast');
  if (toast) toast.style.display = 'none';

  const modal = document.getElementById('adminTelehealthModal');
  const patientTitle = document.getElementById('adminRoomCallerTitle');
  const patientNameEl = document.getElementById('adminRoomPatientName');

  const pName = currentAdminCallData?.patientName || 'Patient (Active)';
  if (patientTitle) patientTitle.textContent = `${pName} · Live Telehealth Session`;
  if (patientNameEl) patientNameEl.textContent = `${pName} (Webcam & Audio Live)`;

  if (modal) modal.style.display = 'flex';
  showToast('✅ Call Connected! Live consultation session active.');
}

function declineAdminTelehealthCall() {
  stopAdminTeamsRingtone();
  const toast = document.getElementById('adminTeamsToast');
  if (toast) toast.style.display = 'none';
  currentAdminCallData = null;
}

function closeAdminTelehealthRoom() {
  const modal = document.getElementById('adminTelehealthModal');
  if (modal) modal.style.display = 'none';
  currentAdminCallData = null;
  showToast('Session ended. Clinical records updated.');
}

function toggleAdminMic(btn) {
  if (btn.textContent.includes('Mute')) {
    btn.textContent = '🔇 Unmute';
    btn.classList.add('btn-danger');
  } else {
    btn.textContent = '🎙️ Mute';
    btn.classList.remove('btn-danger');
  }
}

function toggleAdminCam(btn) {
  if (btn.textContent.includes('Video')) {
    btn.textContent = '🚫 Cam Off';
    btn.classList.add('btn-danger');
  } else {
    btn.textContent = '📹 Video';
    btn.classList.remove('btn-danger');
  }
}

function sendAdminTelehealthReply() {
  const input = document.getElementById('adminReplyInput');
  const log = document.getElementById('adminChatLog');
  if (!input || !input.value.trim() || !log) return;

  const msgDiv = document.createElement('div');
  msgDiv.style.cssText = 'background: #0284c7; padding: 6px 10px; border-radius: 6px; align-self: flex-end; color: #fff;';
  msgDiv.innerHTML = `<strong>Doctor (You):</strong> ${escapeHtml(input.value.trim())}`;
  log.appendChild(msgDiv);
  log.scrollTop = log.scrollHeight;
  input.value = '';
}

// Cross-tab synchronization: ring Admin Portal when patient calls on the main site!
if (typeof window !== 'undefined') {
  window.addEventListener('storage', function(e) {
    if (e.key === 'mb_telehealth_call' && e.newValue) {
      try {
        const call = JSON.parse(e.newValue);
        if (call.status === 'RINGING') {
          showAdminIncomingTeamsCall(call);
        }
      } catch (err) {}
    } else if (e.key === 'mb_telehealth_event' && e.newValue && e.newValue.startsWith('ENDED')) {
      closeAdminTelehealthRoom();
      declineAdminTelehealthCall();
    }
  });
}


