import React from 'react';
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
  Clock, 
  HeartHandshake,
  CheckCircle2,
  Stethoscope
} from 'lucide-react';
import Badge from '../common/Badge';

export default function OverviewDashboard() {
  const { 
    setActiveTab, 
    doctorApplications, 
    sosAlerts, 
    campaigns, 
    admins, 
    appControls, 
    currentRole, 
    isSuperAdmin,
    hasPermission 
  } = useApp();

  const pendingDoctors = doctorApplications.filter(d => d.status === 'pending');
  const activeSos = sosAlerts.filter(a => a.status !== 'resolved');
  const totalCampaignRevenue = campaigns.reduce((acc, c) => acc + (c.revenueGenerated || 0), 0);
  const totalConsultations = campaigns.reduce((acc, c) => acc + (c.consultationsBooked || 0), 0);

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-slate-900 border border-indigo-500/20 rounded-2xl p-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">MindBridge Clinical HQ</span>
            <Badge color={currentRole.color}>{currentRole.name}</Badge>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Healthcare System Command Center
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Real-time control over teleconsultations, specialist credentialing, growth campaigns, and clinical SOS triage.
          </p>
        </div>

        {/* Quick actions bar */}
        <div className="flex flex-wrap items-center gap-2">
          {hasPermission('doctors.verify') && (
            <button
              onClick={() => setActiveTab('doctors')}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition-all"
            >
              <Stethoscope className="w-4 h-4" />
              <span>Verify Doctors ({pendingDoctors.length})</span>
            </button>
          )}

          {isSuperAdmin && (
            <button
              onClick={() => setActiveTab('hiring')}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all"
            >
              <Briefcase className="w-4 h-4" />
              <span>Hiring Positions</span>
            </button>
          )}

          {hasPermission('app_control.manage') && (
            <button
              onClick={() => setActiveTab('app_control')}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all"
            >
              <Sliders className="w-4 h-4" />
              <span>Dynamic Controls</span>
            </button>
          )}
        </div>
      </div>

      {/* Critical SOS Alert Banner if any pending */}
      {activeSos.length > 0 && (
        <div className="bg-rose-950/40 border border-rose-500/40 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-pulse-subtle">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center flex-shrink-0 border border-rose-500/40">
              <AlertTriangle className="w-5 h-5 text-rose-400 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-400">Critical Patient Alert</span>
                <Badge color="rose">{activeSos.length} In Progress</Badge>
              </div>
              <p className="text-xs text-slate-200 mt-0.5">
                {activeSos[0].patientName}: {activeSos[0].trigger} ({activeSos[0].timeElapsed})
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('monitoring')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold self-start sm:self-auto"
          >
            <span>Open SOS Triage</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Core Telemetry Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Active Patients */}
        <div className="glass-card rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total Active Patients</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-white">24,812</span>
            <span className="text-xs font-medium text-emerald-400 flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" /> +14.2%
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Across 18 global telehealth regions</p>
        </div>

        {/* Metric 2: Verified Specialist Doctors */}
        <div className="glass-card rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Verified Doctors</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Stethoscope className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-white">1,420</span>
            <Badge color="emerald" className="text-[10px]">99.2% Active</Badge>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{pendingDoctors.length} applications awaiting specialist review</p>
        </div>

        {/* Metric 3: Influencer Growth & Revenue */}
        <div className="glass-card rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Partner Driven Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
              <Megaphone className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-white">${totalCampaignRevenue.toLocaleString()}</span>
            <span className="text-xs font-medium text-purple-400">{totalConsultations} Consults</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Generated via trackable influencer campaigns</p>
        </div>

        {/* Metric 4: System Availability */}
        <div className="glass-card rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">System SLA & Uptime</span>
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-400">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-emerald-400">99.98%</span>
            <Badge color="teal" className="text-[10px]">32ms API</Badge>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">HIPAA Cloud & WebRTC Encrypted</p>
        </div>
      </div>

      {/* Two Column Layout: Doctor Verification Spotlight & Dynamic App Controls Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Doctor Verification Queue (Highlighting user requirement) */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-400" />
                <span>Doctor Verification Queue (Specialist Board)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Specialist doctors inspect state licenses, council registration IDs, and credential documents.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('doctors')}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {doctorApplications.slice(0, 3).map(doc => (
              <div 
                key={doc.id}
                className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <img 
                    src={doc.avatar} 
                    alt={doc.name} 
                    className="w-11 h-11 rounded-xl object-cover border border-slate-700 flex-shrink-0" 
                  />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-white">{doc.name}</span>
                      <Badge 
                        color={doc.status === 'verified' ? 'emerald' : doc.status === 'rejected' ? 'rose' : doc.status === 'needs_documents' ? 'amber' : 'sky'}
                        className="text-[10px]"
                      >
                        {doc.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-400">{doc.specialty} • {doc.hospital}</p>
                    <p className="text-[10px] text-indigo-400 font-mono mt-0.5">Council: {doc.regNumber}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    onClick={() => setActiveTab('doctors')}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
                  >
                    Inspect Credentials
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dynamic Feature Flags Quick Status */}
        <div className="glass-card rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-400" />
                <span>Dynamic Flags</span>
              </h2>
              <button
                onClick={() => setActiveTab('app_control')}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300"
              >
                Configure
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Live switches toggled by administrators without redeployment:
            </p>

            <div className="space-y-2.5">
              {Object.entries(appControls.features).slice(0, 4).map(([key, item]) => (
                <div key={key} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                  <span className="text-xs font-medium text-slate-200">{item.name}</span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    item.enabled 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                  }`}>
                    {item.enabled ? 'ACTIVE' : 'OFF'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Maintenance Mode:</span>
              <span className={appControls.maintenanceMode ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                {appControls.maintenanceMode ? 'ACTIVE' : 'DISABLED'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
