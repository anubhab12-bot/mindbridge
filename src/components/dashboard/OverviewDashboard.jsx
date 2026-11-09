import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Users, 
  UserCheck, 
  AlertTriangle, 
  Activity, 
  TrendingUp, 
  ShieldCheck, 
  Briefcase, 
  Megaphone, 
  Sliders, 
  ArrowUpRight, 
  Stethoscope,
  Trash2,
  RefreshCw,
  Server,
  Plus
} from 'lucide-react';
import Badge from '../common/Badge';
import Modal from '../common/Modal';

export default function OverviewDashboard() {
  const { 
    setActiveTab, 
    liveDoctors, 
    liveStats, 
    liveSettings, 
    liveHealth, 
    purgeAllBackendData, 
    addNewLivePatient, 
    currentRole, 
    isSuperAdmin,
    hasPermission 
  } = useApp();

  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [newPatient, setNewPatient] = useState({ name: '', email: '', password: '' });
  const [isPurging, setIsPurging] = useState(false);

  // Real backend metrics
  const registeredUsersCount = liveStats?.liveDatabaseMetrics?.registeredUsers?.count ?? liveStats?.totalUsers ?? liveDoctors.length;
  const activePatientsCount = liveStats?.liveDatabaseMetrics?.activePatients?.count ?? 0;
  const councilSeatsCount = liveStats?.liveDatabaseMetrics?.occupiedCouncilSeats?.count ?? liveSettings?.occupiedSeats ?? 0;
  const dynamicFeaturesList = liveSettings?.dynamicFeatures || [];

  const handleAddPatient = async (e) => {
    e.preventDefault();
    if (!newPatient.name || !newPatient.email) return;
    try {
      await addNewLivePatient(newPatient);
      setIsPatientModalOpen(false);
      setNewPatient({ name: '', email: '', password: '' });
      alert('Patient registered in live MongoDB database!');
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handlePurge = async () => {
    if (confirm('Permanently delete all test users and doctors from backend MongoDB?')) {
      setIsPurging(true);
      try {
        await purgeAllBackendData();
        alert('All test users and doctors deleted successfully!');
      } finally {
        setIsPurging(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-slate-900 border border-indigo-500/20 rounded-2xl p-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">MindBridge Production API</span>
            <Badge color="emerald">Connected</Badge>
            <Badge color={currentRole.color}>{currentRole.name}</Badge>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Live Healthcare Operations Center
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Operating strictly on real live data from MongoDB. Zero demo fixtures. Monitor practitioner applications, council seats, and live database metrics in real time.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {hasPermission('doctors.verify') && (
            <button
              onClick={() => setActiveTab('doctors')}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition-all"
            >
              <Stethoscope className="w-4 h-4" />
              <span>Doctors ({liveDoctors.length})</span>
            </button>
          )}

          {isSuperAdmin && (
            <>
              <button
                onClick={() => setIsPatientModalOpen(true)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-lg shadow-sky-600/20 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Add Real Patient</span>
              </button>

              <button
                onClick={handlePurge}
                disabled={isPurging}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 text-xs font-semibold transition-all"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isPurging ? 'Purging...' : 'Purge All Test Data'}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Real Core Telemetry Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Registered Users */}
        <div className="glass-card rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total Registered Users</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-white">{registeredUsersCount}</span>
            <span className="text-xs text-indigo-400 font-medium">In MongoDB</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Live from /governance/stats</p>
        </div>

        {/* Metric 2: Live Registered Doctors */}
        <div className="glass-card rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Doctors in Database</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Stethoscope className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-white">{liveDoctors.length}</span>
            <Badge color="emerald" className="text-[10px]">Real Profiles</Badge>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Specialists & clinical psychologists</p>
        </div>

        {/* Metric 3: Active Patients */}
        <div className="glass-card rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Active Patients</span>
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-400">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-sky-400">{activePatientsCount}</span>
            <span className="text-xs text-slate-400">Registered</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Connected patients on live app</p>
        </div>

        {/* Metric 4: API Response & Uptime */}
        <div className="glass-card rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Backend API Latency</span>
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-400">
              <Server className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-emerald-400">{liveHealth.latency} ms</span>
            <Badge color="teal" className="text-[10px] uppercase">{liveHealth.status}</Badge>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">mindbridge-api-x99i.onrender.com</p>
        </div>
      </div>

      {/* Two Column Layout: Real Doctors in DB & Live Dynamic Features */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Doctors Directory preview */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-400" />
                <span>Live Registered Doctors (MongoDB)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Real practitioner profiles currently stored on the backend.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('doctors')}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              <span>Manage All ({liveDoctors.length})</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {liveDoctors.length === 0 ? (
            <div className="p-8 rounded-xl bg-slate-900/40 border border-slate-800 text-center">
              <p className="text-xs text-slate-400">No doctors currently in database. Click "Add Real Doctor" in the top bar to register the first practitioner.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {liveDoctors.slice(0, 4).map(doc => (
                <div 
                  key={doc.id}
                  className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-bold flex items-center justify-center text-xs flex-shrink-0">
                      {(doc.displayName || 'Dr').substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-white">{doc.displayName}</span>
                        <Badge color={doc.verified ? 'emerald' : 'amber'} className="text-[10px]">
                          {doc.verified ? 'VERIFIED' : 'PENDING'}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-400">{doc.professionalCategory?.replace('_', ' ')} • {doc.yearsExperience || 0} yrs exp</p>
                      <p className="text-[10px] text-indigo-400 font-mono mt-0.5">ID: {doc.id}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <span className="text-xs font-mono text-emerald-400 font-bold">
                      {doc.consultationFee?.amount ? `${doc.consultationFee.currency} ${doc.consultationFee.amount}` : 'Unset'}
                    </span>
                    <button
                      onClick={() => setActiveTab('doctors')}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors"
                    >
                      Inspect
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Dynamic Features from Backend */}
        <div className="glass-card rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-400" />
                <span>Live Features</span>
              </h2>
              <Badge color="sky" className="text-[10px]">Backend Sync</Badge>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Real-time dynamic features configured in `/governance/settings`:
            </p>

            <div className="space-y-2.5">
              {dynamicFeaturesList.map((feat) => (
                <div key={feat.id} className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-200">{feat.title}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                      feat.enabled ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                    }`}>
                      {feat.enabled ? 'LIVE' : 'OFF'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">{feat.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Council Occupied:</span>
              <span className="text-indigo-400 font-bold">{councilSeatsCount} Seats</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Add Patient */}
      <Modal
        isOpen={isPatientModalOpen}
        onClose={() => setIsPatientModalOpen(false)}
        title="Add New Real Patient to Live MongoDB"
        subtitle="Registers and verifies patient account via backend API"
      >
        <form onSubmit={handleAddPatient} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Patient Full Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Ananya Sen"
              value={newPatient.name}
              onChange={e => setNewPatient({ ...newPatient, name: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Patient Email</label>
            <input
              type="email"
              required
              placeholder="e.g. ananya.sen@example.com"
              value={newPatient.email}
              onChange={e => setNewPatient({ ...newPatient, email: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Temporary Password</label>
            <input
              type="password"
              placeholder="SecurePatient#2026 (default)"
              value={newPatient.password}
              onChange={e => setNewPatient({ ...newPatient, password: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsPatientModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-lg shadow-sky-600/20 transition-all"
            >
              Register Patient in MongoDB
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
