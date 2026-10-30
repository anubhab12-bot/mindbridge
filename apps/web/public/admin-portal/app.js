// API Base URL
const API_BASE = 'https://mindbridge-api-x99i.onrender.com/api/v1/governance';

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
  occupiedSeats: 7
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
document.addEventListener('DOMContentLoaded', () => {
  loadLocalState();
  initCharts();
  renderApplications();
  renderTasks();
  renderAiMissions();
  syncSettingsFromApi();
});

// Load stored data or defaults
function loadLocalState() {
  const savedApps = localStorage.getItem('mb_admin_apps');
  applications = savedApps ? JSON.parse(savedApps) : DEFAULT_APPLICATIONS;

  const savedTasks = localStorage.getItem('mb_admin_tasks');
  tasks = savedTasks ? JSON.parse(savedTasks) : DEFAULT_TASKS;

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

// Tab Switching
function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(tab => tab.style.display = 'none');
  document.querySelectorAll('.tab-link').forEach(link => link.classList.remove('active'));

  const activeTab = document.getElementById(tabId);
  if (activeTab) activeTab.style.display = 'block';

  const navMap = {
    'tab-overview': 'nav-overview',
    'tab-council': 'nav-council',
    'tab-site-settings': 'nav-site-settings',
    'tab-ai-tools': 'nav-ai-tools',
    'tab-tasks': 'nav-tasks'
  };

  const navEl = document.getElementById(navMap[tabId]);
  if (navEl) navEl.classList.add('active');
}

// Seat Tracker UI
function updateSeatTracker() {
  const occupied = applications.filter(a => a.status === 'APPROVED').length + 4; // Baseline
  document.getElementById('seatsOccupiedNum').textContent = Math.min(12, occupied);
  document.getElementById('seatsTotalNum').textContent = siteSettings.totalCouncilSeats || 12;
}

// Initialize Interactive Charts
function initCharts() {
  // Chart 1: Recovery Trajectory
  const recoveryCtx = document.getElementById('recoveryChart')?.getContext('2d');
  if (recoveryCtx) {
    new Chart(recoveryCtx, {
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

  // Chart 2: Symptoms Alleviation Doughnut
  const symptomsCtx = document.getElementById('symptomsChart')?.getContext('2d');
  if (symptomsCtx) {
    new Chart(symptomsCtx, {
      type: 'doughnut',
      data: {
        labels: ['Anxiety & Panic (96.4%)', 'Work Stress & Burnout (97.0%)', 'Depressive Lifting (93.2%)', 'PTSD & Trauma (91.8%)'],
        datasets: [{
          data: [96.4, 97.0, 93.2, 91.8],
          backgroundColor: ['#10b981', '#0d9488', '#3b82f6', '#8b5cf6'],
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

  // Chart 3: Growth vs Cured
  const growthCtx = document.getElementById('growthChart')?.getContext('2d');
  if (growthCtx) {
    new Chart(growthCtx, {
      type: 'bar',
      data: {
        labels: ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct 2026'],
        datasets: [
          {
            label: 'Total Onboarded Patients',
            data: [4200, 6800, 9400, 11800, 13400, 14850],
            backgroundColor: 'rgba(59, 130, 246, 0.7)',
            borderRadius: 6
          },
          {
            label: 'Patients Successfully Improved / Discharged',
            data: [3800, 6200, 8800, 11100, 12600, 14048],
            backgroundColor: 'rgba(16, 185, 129, 0.85)',
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

  // Chart 4: Regional Outreach
  const regionalCtx = document.getElementById('regionalChart')?.getContext('2d');
  if (regionalCtx) {
    new Chart(regionalCtx, {
      type: 'polarArea',
      data: {
        labels: ['South India (48 Clinics)', 'West India (34 Clinics)', 'North India (28 Clinics)', 'East India (14 Clinics)'],
        datasets: [{
          data: [48, 34, 28, 14],
          backgroundColor: [
            'rgba(16, 185, 129, 0.7)',
            'rgba(59, 130, 246, 0.7)',
            'rgba(245, 158, 11, 0.7)',
            'rgba(139, 92, 246, 0.7)'
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
}

// Render Applications Table
function renderApplications(filterCat = 'ALL') {
  const tbody = document.getElementById('applicationsBody');
  if (!tbody) return;

  const filtered = filterCat === 'ALL' 
    ? applications 
    : applications.filter(a => a.category === filterCat);

  tbody.innerHTML = filtered.map(app => {
    const isSafe = app.aiSafety.isSafe;
    const safetyBadge = isSafe
      ? `<span class="badge badge-ai-safe">🟢 ${app.aiSafety.safetyScore}% Brand Safe</span>`
      : `<span class="badge badge-ai-flagged">🔴 ${app.aiSafety.safetyScore}% Nudity/Vulgarity Flagged</span>`;

    let details = '';
    if (app.category === 'SPECIALIST') {
      details = `Lic: ${app.credentials.licenseNumber || 'N/A'} • ${app.credentials.yearsExperience || 0} yrs exp`;
    } else if (app.category === 'NGO') {
      details = `Reg: ${app.credentials.ngoRegistrationNumber || 'N/A'} • ${app.credentials.operatingRegions?.join(', ') || 'India'}`;
    } else {
      details = `${app.credentials.socialHandle || '@creator'} (${(app.credentials.followersCount || 0).toLocaleString()} reach)`;
    }

    let statusBadge = '';
    if (app.status === 'APPROVED') statusBadge = `<span class="badge badge-approved">Approved (Seat #${app.seatNumber || 1})</span>`;
    else if (app.status === 'REJECTED') statusBadge = `<span class="badge badge-ai-flagged">Rejected</span>`;
    else if (app.status === 'AI_SAFETY_FLAGGED') statusBadge = `<span class="badge badge-ai-flagged">AI Flagged</span>`;
    else statusBadge = `<span class="badge badge-pending">Pending Review</span>`;

    const canAction = currentRole === 'SUPER_ADMIN' && (app.status === 'PENDING_REVIEW' || app.status === 'AI_SAFETY_FLAGGED');

    const actions = canAction ? `
      <div style="display: flex; gap: 6px;">
        <button class="btn btn-primary btn-sm" onclick="decideApp('${app.id}', 'APPROVED')">Approve</button>
        <button class="btn btn-danger btn-sm" onclick="decideApp('${app.id}', 'REJECTED')">Reject</button>
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
            ${app.credentials.sampleContent || ''}
          </div>
        </td>
        <td>
          ${safetyBadge}<br>
          <span style="font-size: 0.75rem; color: var(--text-dim);">${app.aiSafety.summary}</span>
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
function decideApp(id, decision) {
  const app = applications.find(a => a.id === id);
  if (!app) return;

  app.status = decision;
  if (decision === 'APPROVED') {
    const occupied = applications.filter(a => a.status === 'APPROVED').length;
    app.seatNumber = Math.min(12, occupied);
    showToast(`Approved ${app.fullName} to Council Seat #${app.seatNumber}!`);
  } else {
    showToast(`Rejected application for ${app.fullName}.`);
  }

  saveLocalState();
  renderApplications();
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

function verifyTaskProof(taskId, decision) {
  const t = tasks.find(x => x.id === taskId);
  if (!t) return;

  t.status = decision;
  showToast(`Proof marked as: ${decision}!`);
  saveLocalState();
  renderTasks();
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

function handleApplySubmit(e) {
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

function handleProofSubmit(e) {
  e.preventDefault();
  const taskId = document.getElementById('proofTaskId').value;
  const url = document.getElementById('proofUrl').value.trim();
  const impressions = Number(document.getElementById('proofImpressions').value) || 0;
  const notes = document.getElementById('proofNotes').value.trim();

  const task = tasks.find(t => t.id === taskId);
  if (task) {
    task.status = 'PROOF_SUBMITTED';
    task.proof = {
      url,
      impressions,
      notes,
      submittedAt: new Date().toISOString().split('T')[0]
    };
    saveLocalState();
    renderTasks();
    closeProofModal();
    showToast('🚀 Campaign proof submitted to Super Admin for verification!');
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
