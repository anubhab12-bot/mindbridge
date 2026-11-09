import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  AVAILABLE_PERMISSIONS,
  INITIAL_ROLES,
  INITIAL_ADMINS,
  INITIAL_HIRING_POSITIONS,
  INITIAL_CANDIDATES,
  INITIAL_DOCTOR_APPLICATIONS,
  INITIAL_INFLUENCER_CAMPAIGNS,
  INITIAL_APP_CONTROLS,
  INITIAL_SOS_ALERTS,
  INITIAL_AUDIT_LOGS,
} from '../data/mockData';

const AppContext = createContext();

const STORAGE_PREFIX = 'mindbridge_admin_v1_';

function loadStorage(key, fallback) {
  try {
    const item = localStorage.getItem(STORAGE_PREFIX + key);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    console.error('Failed reading localStorage', e);
    return fallback;
  }
}

function saveStorage(key, data) {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(data));
  } catch (e) {
    console.error('Failed saving to localStorage', e);
  }
}

export function AppProvider({ children }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentAdminId, setCurrentAdminId] = useState(() => loadStorage('currentAdminId', 'adm-01'));
  
  const [roles, setRoles] = useState(() => loadStorage('roles', INITIAL_ROLES));
  const [admins, setAdmins] = useState(() => loadStorage('admins', INITIAL_ADMINS));
  const [hiringPositions, setHiringPositions] = useState(() => loadStorage('hiringPositions', INITIAL_HIRING_POSITIONS));
  const [candidates, setCandidates] = useState(() => loadStorage('candidates', INITIAL_CANDIDATES));
  const [doctorApplications, setDoctorApplications] = useState(() => loadStorage('doctorApplications', INITIAL_DOCTOR_APPLICATIONS));
  const [campaigns, setCampaigns] = useState(() => loadStorage('campaigns', INITIAL_INFLUENCER_CAMPAIGNS));
  const [appControls, setAppControls] = useState(() => loadStorage('appControls', INITIAL_APP_CONTROLS));
  const [sosAlerts, setSosAlerts] = useState(() => loadStorage('sosAlerts', INITIAL_SOS_ALERTS));
  const [auditLogs, setAuditLogs] = useState(() => loadStorage('auditLogs', INITIAL_AUDIT_LOGS));

  // Sync to localStorage
  useEffect(() => saveStorage('currentAdminId', currentAdminId), [currentAdminId]);
  useEffect(() => saveStorage('roles', roles), [roles]);
  useEffect(() => saveStorage('admins', admins), [admins]);
  useEffect(() => saveStorage('hiringPositions', hiringPositions), [hiringPositions]);
  useEffect(() => saveStorage('candidates', candidates), [candidates]);
  useEffect(() => saveStorage('doctorApplications', doctorApplications), [doctorApplications]);
  useEffect(() => saveStorage('campaigns', campaigns), [campaigns]);
  useEffect(() => saveStorage('appControls', appControls), [appControls]);
  useEffect(() => saveStorage('sosAlerts', sosAlerts), [sosAlerts]);
  useEffect(() => saveStorage('auditLogs', auditLogs), [auditLogs]);

  // Current logged in admin
  const currentAdmin = admins.find(a => a.id === currentAdminId) || admins[0];
  const currentRole = roles.find(r => r.id === currentAdmin?.roleId) || roles[0];

  // RBAC Permission checker
  const hasPermission = (permissionId) => {
    if (!currentRole) return false;
    if (currentRole.permissions.includes('system.full_access')) return true;
    return currentRole.permissions.includes(permissionId);
  };

  const isSuperAdmin = currentRole?.id === 'super_admin' || currentRole?.permissions.includes('system.full_access');

  // Audit logger helper
  const addAuditLog = (action, details, badge = 'rose') => {
    const newLog = {
      id: 'aud-' + Date.now(),
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      adminName: currentAdmin.name,
      adminRole: currentRole.name,
      action,
      details,
      ip: '192.168.1.' + Math.floor(Math.random() * 200 + 10),
      badge,
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  // Switch impersonated admin
  const switchUser = (adminId) => {
    const target = admins.find(a => a.id === adminId);
    if (target) {
      setCurrentAdminId(adminId);
      addAuditLog('SESSION_SWITCH', `Switched active session view to ${target.name} (${target.title})`, 'sky');
    }
  };

  // Admin Management (Superadmin)
  const addAdmin = (data) => {
    const newAdmin = {
      id: 'adm-' + Date.now().toString().slice(-4),
      status: 'active',
      joinedDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      lastActive: 'Just now',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      twoFactor: false,
      ...data,
    };
    setAdmins(prev => [newAdmin, ...prev]);
    addAuditLog('ADMIN_CREATED', `Superadmin created new admin account for ${data.name} with role ${data.roleId}`, 'rose');
    return newAdmin;
  };

  const updateAdmin = (id, partial) => {
    setAdmins(prev => prev.map(a => a.id === id ? { ...a, ...partial } : a));
    addAuditLog('ADMIN_UPDATED', `Updated administrator ID: ${id}`, 'amber');
  };

  const deleteAdmin = (id) => {
    const target = admins.find(a => a.id === id);
    if (id === currentAdminId) return false;
    setAdmins(prev => prev.filter(a => a.id !== id));
    addAuditLog('ADMIN_DELETED', `Revoked admin privileges for ${target?.name || id}`, 'rose');
    return true;
  };

  // Dynamic Role Management
  const createRole = (data) => {
    const newRole = {
      id: 'role_' + data.name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now().toString().slice(-3),
      isSystem: false,
      color: data.color || 'indigo',
      ...data,
    };
    setRoles(prev => [...prev, newRole]);
    addAuditLog('ROLE_CREATED', `Superadmin created dynamic role "${data.name}" with ${data.permissions.length} granular permissions`, 'purple');
    return newRole;
  };

  const updateRole = (id, partial) => {
    setRoles(prev => prev.map(r => r.id === id ? { ...r, ...partial } : r));
    addAuditLog('ROLE_UPDATED', `Updated configuration for role ID: ${id}`, 'indigo');
  };

  const deleteRole = (id) => {
    const role = roles.find(r => r.id === id);
    if (role?.isSystem) return false;
    setRoles(prev => prev.filter(r => r.id !== id));
    addAuditLog('ROLE_DELETED', `Deleted dynamic custom role: ${role?.name || id}`, 'rose');
    return true;
  };

  // Hiring & Staff Positions
  const addHiringPosition = (data) => {
    const newPos = {
      id: 'pos-' + Date.now().toString().slice(-4),
      applicantsCount: 0,
      status: 'active',
      postedDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      ...data,
    };
    setHiringPositions(prev => [newPos, ...prev]);
    addAuditLog('POSITION_POSTED', `Superadmin opened new hiring requisition: "${data.title}" in ${data.department}`, 'emerald');
    return newPos;
  };

  const updateCandidateStage = (id, stage) => {
    setCandidates(prev => prev.map(c => c.id === id ? { ...c, stage } : c));
    const cand = candidates.find(c => c.id === id);
    addAuditLog('CANDIDATE_STAGE_CHANGED', `Candidate ${cand?.name} moved to stage: ${stage}`, 'sky');
  };

  const hireCandidate = (candidateId) => {
    const candidate = candidates.find(c => c.id === candidateId);
    if (!candidate) return;
    const position = hiringPositions.find(p => p.id === candidate.positionId);

    // Update candidate stage
    setCandidates(prev => prev.map(c => c.id === candidateId ? { ...c, stage: 'hired' } : c));

    // Auto-provision Admin account
    const newAdmin = {
      id: 'adm-' + Date.now().toString().slice(-4),
      name: candidate.name,
      email: candidate.email,
      roleId: position ? position.roleId : 'specialist_doctor_verifier',
      title: position ? position.title : 'Staff Specialist',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      status: 'active',
      lastActive: 'Just now',
      joinedDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      twoFactor: false,
    };
    setAdmins(prev => [newAdmin, ...prev]);

    addAuditLog('STAFF_HIRED', `Candidate ${candidate.name} officially hired for "${position?.title}". Admin account auto-provisioned with role: ${newAdmin.roleId}`, 'emerald');
  };

  // Doctor Verification & Approvals (Specialist Doctor Role workflow)
  const verifyDoctor = (docId, status, notes) => {
    setDoctorApplications(prev => prev.map(d => {
      if (d.id === docId) {
        return {
          ...d,
          status,
          verifiedBy: `${currentAdmin.name} (${currentRole.name})`,
          verificationNotes: notes || d.verificationNotes,
          verifiedAt: new Date().toISOString(),
        };
      }
      return d;
    }));

    const doc = doctorApplications.find(d => d.id === docId);
    const badgeColor = status === 'verified' ? 'emerald' : status === 'rejected' ? 'rose' : 'amber';
    addAuditLog('DOCTOR_VERIFICATION', `Doctor ${doc?.name} status set to "${status.toUpperCase()}". Reviewer: ${currentAdmin.name}. Notes: ${notes || 'Updated'}`, badgeColor);
  };

  // Influencer & Campaign Marketing
  const createCampaign = (data) => {
    const newCamp = {
      id: 'camp-' + Date.now().toString().slice(-4),
      createdDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      clicks: 0,
      signups: 0,
      consultationsBooked: 0,
      revenueGenerated: 0,
      commissionEarned: 0,
      payoutStatus: 'pending',
      status: 'active',
      ...data,
    };
    setCampaigns(prev => [newCamp, ...prev]);
    addAuditLog('CAMPAIGN_CREATED', `Influencer campaign "${data.name}" created with code ${data.promoCode} and slug /${data.slug}`, 'purple');
    return newCamp;
  };

  const updateCampaign = (id, partial) => {
    setCampaigns(prev => prev.map(c => c.id === id ? { ...c, ...partial } : c));
    addAuditLog('CAMPAIGN_UPDATED', `Updated campaign ID: ${id}`, 'purple');
  };

  // App Controls & Feature Flags
  const toggleFeatureFlag = (key) => {
    setAppControls(prev => {
      const current = prev.features[key];
      const updated = {
        ...prev,
        features: {
          ...prev.features,
          [key]: {
            ...current,
            enabled: !current.enabled,
          },
        },
      };
      addAuditLog('FEATURE_FLAG_TOGGLED', `Dynamic flag "${current.name}" changed to: ${!current.enabled ? 'ENABLED' : 'DISABLED'}`, !current.enabled ? 'emerald' : 'amber');
      return updated;
    });
  };

  const toggleMaintenanceMode = () => {
    setAppControls(prev => {
      const nextMode = !prev.maintenanceMode;
      addAuditLog('MAINTENANCE_MODE', `Global maintenance mode toggled to: ${nextMode ? 'ON' : 'OFF'}`, nextMode ? 'rose' : 'emerald');
      return {
        ...prev,
        maintenanceMode: nextMode,
      };
    });
  };

  const updateGlobalBanner = (bannerData) => {
    setAppControls(prev => ({
      ...prev,
      banner: { ...prev.banner, ...bannerData },
    }));
    addAuditLog('BANNER_UPDATED', `Updated global patient/doctor alert banner: "${bannerData.text}"`, 'sky');
  };

  const updateFinancials = (finData) => {
    setAppControls(prev => ({
      ...prev,
      financials: { ...prev.financials, ...finData },
    }));
    addAuditLog('FINANCIAL_RULES_UPDATED', `Updated consultation fee base: $${finData.baseDoctorConsultFee}, commission: ${finData.platformCommissionPercent}%`, 'amber');
  };

  // SOS Emergency Triage
  const resolveSosAlert = (id, newStatus) => {
    setSosAlerts(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
    const alert = sosAlerts.find(a => a.id === id);
    addAuditLog('SOS_ALERT_UPDATED', `Emergency alert ${alert?.patientName} changed to status: ${newStatus}`, newStatus === 'resolved' ? 'emerald' : 'rose');
  };

  // Reset to original mock state
  const resetToDefaults = () => {
    localStorage.clear();
    setRoles(INITIAL_ROLES);
    setAdmins(INITIAL_ADMINS);
    setHiringPositions(INITIAL_HIRING_POSITIONS);
    setCandidates(INITIAL_CANDIDATES);
    setDoctorApplications(INITIAL_DOCTOR_APPLICATIONS);
    setCampaigns(INITIAL_INFLUENCER_CAMPAIGNS);
    setAppControls(INITIAL_APP_CONTROLS);
    setSosAlerts(INITIAL_SOS_ALERTS);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setCurrentAdminId('adm-01');
    setActiveTab('dashboard');
  };

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        currentAdmin,
        currentRole,
        currentAdminId,
        switchUser,
        isSuperAdmin,
        hasPermission,
        AVAILABLE_PERMISSIONS,
        roles,
        admins,
        addAdmin,
        updateAdmin,
        deleteAdmin,
        createRole,
        updateRole,
        deleteRole,
        hiringPositions,
        addHiringPosition,
        candidates,
        updateCandidateStage,
        hireCandidate,
        doctorApplications,
        verifyDoctor,
        campaigns,
        createCampaign,
        updateCampaign,
        appControls,
        toggleFeatureFlag,
        toggleMaintenanceMode,
        updateGlobalBanner,
        updateFinancials,
        sosAlerts,
        resolveSosAlert,
        auditLogs,
        addAuditLog,
        resetToDefaults,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
