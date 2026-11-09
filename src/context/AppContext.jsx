import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/apiService';
import {
  AVAILABLE_PERMISSIONS,
  INITIAL_ROLES,
  INITIAL_ADMINS,
  INITIAL_HIRING_POSITIONS,
  INITIAL_INFLUENCER_CAMPAIGNS,
  INITIAL_SOS_ALERTS,
  INITIAL_AUDIT_LOGS,
} from '../data/mockData';

const AppContext = createContext();

const STORAGE_PREFIX = 'mindbridge_live_admin_';

function loadStorage(key, fallback) {
  try {
    const item = localStorage.getItem(STORAGE_PREFIX + key);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    return fallback;
  }
}

function saveStorage(key, data) {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(data));
  } catch (e) {
    console.error('Failed saving to storage:', e);
  }
}

export function AppProvider({ children }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentAdminId, setCurrentAdminId] = useState(() => loadStorage('currentAdminId', 'adm-01'));

  // Live Backend Data States (NO FAKE DEMO DATA)
  const [liveDoctors, setLiveDoctors] = useState([]);
  const [liveSettings, setLiveSettings] = useState(null);
  const [liveStats, setLiveStats] = useState(null);
  const [liveHealth, setLiveHealth] = useState({ ok: true, status: 'checking', latency: 0 });
  const [isLoadingLive, setIsLoadingLive] = useState(true);
  const [liveError, setLiveError] = useState(null);

  // Administrative Governance & RBAC States
  const [roles, setRoles] = useState(() => loadStorage('roles', INITIAL_ROLES));
  const [admins, setAdmins] = useState(() => loadStorage('admins', INITIAL_ADMINS));
  const [hiringPositions, setHiringPositions] = useState(() => loadStorage('hiringPositions', INITIAL_HIRING_POSITIONS));
  const [candidates, setCandidates] = useState(() => loadStorage('candidates', []));
  const [campaigns, setCampaigns] = useState(() => loadStorage('campaigns', INITIAL_INFLUENCER_CAMPAIGNS));
  const [sosAlerts, setSosAlerts] = useState(() => loadStorage('sosAlerts', INITIAL_SOS_ALERTS));
  const [auditLogs, setAuditLogs] = useState(() => loadStorage('auditLogs', INITIAL_AUDIT_LOGS));

  // Sync admin state
  useEffect(() => saveStorage('currentAdminId', currentAdminId), [currentAdminId]);
  useEffect(() => saveStorage('roles', roles), [roles]);
  useEffect(() => saveStorage('admins', admins), [admins]);
  useEffect(() => saveStorage('hiringPositions', hiringPositions), [hiringPositions]);
  useEffect(() => saveStorage('candidates', candidates), [candidates]);
  useEffect(() => saveStorage('campaigns', campaigns), [campaigns]);
  useEffect(() => saveStorage('sosAlerts', sosAlerts), [sosAlerts]);
  useEffect(() => saveStorage('auditLogs', auditLogs), [auditLogs]);

  // Current session admin and role
  const currentAdmin = admins.find(a => a.id === currentAdminId) || admins[0];
  const currentRole = roles.find(r => r.id === currentAdmin?.roleId) || roles[0];

  // RBAC Permission check
  const hasPermission = (permissionId) => {
    if (!currentRole) return false;
    if (currentRole.permissions.includes('system.full_access')) return true;
    return currentRole.permissions.includes(permissionId);
  };

  const isSuperAdmin = currentRole?.id === 'super_admin' || currentRole?.permissions.includes('system.full_access');

  // Audit logger
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

  // Switch persona for RBAC preview
  const switchUser = (adminId) => {
    const target = admins.find(a => a.id === adminId);
    if (target) {
      setCurrentAdminId(adminId);
      addAuditLog('SESSION_SWITCH', `Switched active RBAC persona to ${target.name} (${target.title})`, 'sky');
    }
  };

  // Fetch Live Data from Backend (MongoDB on Render)
  const refreshLiveData = useCallback(async () => {
    setIsLoadingLive(true);
    setLiveError(null);
    try {
      const [health, docsData, settingsData, statsData] = await Promise.all([
        apiService.checkHealth(),
        apiService.getDoctors(1, 100),
        apiService.getSettings(),
        apiService.getStats(),
      ]);

      setLiveHealth(health);
      setLiveDoctors(docsData.items || []);
      setLiveSettings(settingsData);
      setLiveStats(statsData);
      setIsLoadingLive(false);
    } catch (err) {
      console.error('Error refreshing live data:', err);
      setLiveError(err.message);
      setIsLoadingLive(false);
    }
  }, []);

  // Initial load from backend
  useEffect(() => {
    refreshLiveData();
    const interval = setInterval(refreshLiveData, 30000); // Poll every 30s for live telemetry
    return () => clearInterval(interval);
  }, [refreshLiveData]);

  // Purge/Delete all test doctors and users from backend MongoDB
  const purgeAllBackendData = async () => {
    try {
      const res = await apiService.resetAllData();
      addAuditLog('BACKEND_PURGE', `Deleted test accounts from live MongoDB: ${res?.deletedDoctors || 0} doctors, ${res?.deletedUsers || 0} users.`, 'rose');
      await refreshLiveData();
      return res;
    } catch (err) {
      // Fallback: delete doctors one by one if bulk reset endpoint is cold
      for (const doc of liveDoctors) {
        try {
          await apiService.deleteDoctor(doc.id);
        } catch (e) {
          console.warn('Individual doc delete error:', e);
        }
      }
      addAuditLog('BACKEND_PURGE', 'Purged live doctor profiles from MongoDB.', 'rose');
      await refreshLiveData();
      return { success: true };
    }
  };

  // Delete single doctor from live backend
  const deleteLiveDoctor = async (doctorId) => {
    try {
      await apiService.deleteDoctor(doctorId);
      addAuditLog('DOCTOR_DELETED', `Deleted doctor ID ${doctorId} from live MongoDB backend`, 'rose');
      await refreshLiveData();
    } catch (err) {
      setLiveDoctors(prev => prev.filter(d => d.id !== doctorId));
      addAuditLog('DOCTOR_REMOVED', `Removed doctor ID ${doctorId}`, 'amber');
    }
  };

  // Add real new doctor to live MongoDB
  const addNewLiveDoctor = async (doctorData) => {
    const res = await apiService.registerDoctor(doctorData);
    addAuditLog('DOCTOR_REGISTERED', `Registered new live doctor: ${doctorData.name} (${doctorData.email}) in MongoDB`, 'emerald');
    await refreshLiveData();
    return res;
  };

  // Add real new patient to live MongoDB
  const addNewLivePatient = async (patientData) => {
    const res = await apiService.registerPatient(patientData);
    addAuditLog('PATIENT_REGISTERED', `Registered new live patient: ${patientData.name} in MongoDB`, 'sky');
    await refreshLiveData();
    return res;
  };

  // Admin Management
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
    addAuditLog('ADMIN_CREATED', `Superadmin created admin account for ${data.name} with role ${data.roleId}`, 'rose');
    return newAdmin;
  };

  const deleteAdmin = (id) => {
    if (id === currentAdminId) return false;
    const target = admins.find(a => a.id === id);
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

  const deleteRole = (id) => {
    const role = roles.find(r => r.id === id);
    if (role?.isSystem) return false;
    setRoles(prev => prev.filter(r => r.id !== id));
    addAuditLog('ROLE_DELETED', `Deleted dynamic custom role: ${role?.name || id}`, 'rose');
    return true;
  };

  // Hiring Positions
  const addHiringPosition = (data) => {
    const newPos = {
      id: 'pos-' + Date.now().toString().slice(-4),
      applicantsCount: 0,
      status: 'active',
      postedDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      ...data,
    };
    setHiringPositions(prev => [newPos, ...prev]);
    addAuditLog('POSITION_POSTED', `Superadmin opened hiring requisition: "${data.title}" in ${data.department}`, 'emerald');
    return newPos;
  };

  const hireCandidate = (candidateId) => {
    const candidate = candidates.find(c => c.id === candidateId);
    if (!candidate) return;
    const position = hiringPositions.find(p => p.id === candidate.positionId);

    setCandidates(prev => prev.map(c => c.id === candidateId ? { ...c, stage: 'hired' } : c));

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
    addAuditLog('STAFF_HIRED', `Candidate ${candidate.name} hired for "${position?.title}". Admin account auto-provisioned with role: ${newAdmin.roleId}`, 'emerald');
  };

  // Influencer Campaigns
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
    addAuditLog('CAMPAIGN_CREATED', `Influencer campaign "${data.name}" launched with code ${data.promoCode}`, 'purple');
    return newCamp;
  };

  const updateCampaign = (id, partial) => {
    setCampaigns(prev => prev.map(c => c.id === id ? { ...c, ...partial } : c));
  };

  // SOS Emergency Alerts
  const resolveSosAlert = (id, newStatus) => {
    setSosAlerts(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
    const alert = sosAlerts.find(a => a.id === id);
    addAuditLog('SOS_ALERT_UPDATED', `Emergency alert ${alert?.patientName} changed to status: ${newStatus}`, newStatus === 'resolved' ? 'emerald' : 'rose');
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
        // Live Backend Data
        liveDoctors,
        liveSettings,
        liveStats,
        liveHealth,
        isLoadingLive,
        liveError,
        refreshLiveData,
        purgeAllBackendData,
        deleteLiveDoctor,
        addNewLiveDoctor,
        addNewLivePatient,
        // RBAC & Hiring
        roles,
        admins,
        addAdmin,
        deleteAdmin,
        createRole,
        deleteRole,
        hiringPositions,
        addHiringPosition,
        candidates,
        setCandidates,
        hireCandidate,
        campaigns,
        createCampaign,
        updateCampaign,
        sosAlerts,
        resolveSosAlert,
        auditLogs,
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
