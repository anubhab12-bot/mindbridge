import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  LayoutDashboard, 
  UserCheck, 
  ShieldCheck, 
  Briefcase, 
  Megaphone, 
  Sliders, 
  Activity, 
  FileText, 
  Lock,
  ChevronRight,
  Bug
} from 'lucide-react';
import Badge from './Badge';

const NAVIGATION_ITEMS = [
  {
    id: 'dashboard',
    label: 'Overview & Operations',
    icon: LayoutDashboard,
    desc: 'Live metrics & real-time summary',
    permission: null,
  },
  {
    id: 'bugs',
    label: 'QA Bug Desk & Task Bar',
    icon: Bug,
    desc: 'Raise tickets, update task bar & retest',
    permission: 'bugs.view',
    badgeKey: 'bugCount',
  },
  {
    id: 'doctors',
    label: 'Doctor Verification',
    icon: UserCheck,
    desc: 'Specialist Doctor review & credentials',
    permission: 'doctors.view',
    badgeKey: 'pendingDocs',
  },
  {
    id: 'rbac',
    label: 'Admins & RBAC Matrix',
    icon: ShieldCheck,
    desc: 'Superadmin: Add admins & custom roles',
    permission: 'rbac.manage_admins',
    superOnly: true,
  },
  {
    id: 'hiring',
    label: 'Dynamic Hiring & Roles',
    icon: Briefcase,
    desc: 'Post new roles (Specialists, Influencers)',
    permission: 'hiring.manage',
    superOnly: true,
  },
  {
    id: 'influencers',
    label: 'Influencer & Growth Hub',
    icon: Megaphone,
    desc: 'Affiliate campaigns & promo links',
    permission: 'influencers.view',
  },
  {
    id: 'app_control',
    label: 'Dynamic App Controls',
    icon: Sliders,
    desc: 'Feature flags, pricing & banners',
    permission: 'app_control.manage',
  },
  {
    id: 'monitoring',
    label: 'Telemetry & SOS Triage',
    icon: Activity,
    desc: '24/7 SOS crisis & server health',
    permission: 'monitoring.view',
    badgeKey: 'sosCount',
  },
  {
    id: 'audit',
    label: 'Security & Audit Logs',
    icon: FileText,
    desc: 'Immutable compliance trail',
    permission: 'audit.view',
  },
];

export default function Sidebar() {
  const { 
    activeTab, 
    setActiveTab, 
    hasPermission, 
    currentRole, 
    liveDoctors = [], 
    doctorApplications = [],
    sosAlerts = [], 
    bugTickets = [],
    isSuperAdmin,
    liveHealth 
  } = useApp();

  const allDocs = (liveDoctors && liveDoctors.length > 0) ? liveDoctors : (doctorApplications || []);
  const pendingDocsCount = allDocs.filter(d => !d.verified || d.status === 'pending').length;
  const activeSosCount = (sosAlerts || []).filter(a => a.status !== 'resolved').length;
  const activeBugsCount = (bugTickets || []).filter(t => t.status === 'open' || t.status === 'in_progress').length;

  return (
    <aside className="w-64 lg:w-72 bg-slate-950 border-r border-slate-800/80 flex flex-col flex-shrink-0 h-[calc(100vh-4rem)] sticky top-16 select-none">
      {/* Current Role Banner */}
      <div className="p-4 border-b border-slate-800/60 bg-slate-900/30">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1 flex items-center justify-between">
          <span>Active RBAC Clearance</span>
          {isSuperAdmin && (
            <span className="text-[10px] text-rose-400 font-bold bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
              GOD MODE
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge color={currentRole?.color || 'indigo'} className="font-semibold px-2 py-1 text-xs" dot>
            {currentRole?.name || 'Superadmin'}
          </Badge>
        </div>
        <p className="text-[11px] text-slate-400 mt-2 line-clamp-2 leading-relaxed">
          {currentRole?.description || 'Full platform control'}
        </p>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Management Modules
        </div>

        {NAVIGATION_ITEMS.map(item => {
          const allowed = !item.permission || hasPermission(item.permission);
          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => {
                if (allowed) {
                  setActiveTab(item.id);
                }
              }}
              disabled={!allowed}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all group ${
                isActive
                  ? 'bg-indigo-600 text-white font-medium shadow-lg shadow-indigo-600/25'
                  : allowed
                  ? 'text-slate-300 hover:text-white hover:bg-slate-900/80'
                  : 'text-slate-600 hover:bg-slate-900/30 cursor-not-allowed opacity-60'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon className={`w-4 h-4 flex-shrink-0 ${
                  isActive ? 'text-white' : allowed ? 'text-slate-400 group-hover:text-indigo-400' : 'text-slate-600'
                }`} />
                <div className="truncate">
                  <div className="text-xs font-semibold truncate leading-tight flex items-center gap-1.5">
                    <span>{item.label}</span>
                    {!allowed && <Lock className="w-3 h-3 text-slate-600 inline" />}
                  </div>
                  <p className={`text-[10px] truncate ${isActive ? 'text-indigo-100' : 'text-slate-400'}`}>
                    {item.desc}
                  </p>
                </div>
              </div>

              {/* Dynamic Counters / Indicators */}
              <div className="flex items-center gap-1 ml-2">
                {item.badgeKey === 'bugCount' && activeBugsCount > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-white text-teal-700' : 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                  }`}>
                    {activeBugsCount}
                  </span>
                )}
                {item.badgeKey === 'pendingDocs' && pendingDocsCount > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-white text-indigo-700' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}>
                    {pendingDocsCount}
                  </span>
                )}
                {item.badgeKey === 'sosCount' && activeSosCount > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-white text-rose-700' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse'
                  }`}>
                    {activeSosCount}
                  </span>
                )}
                {allowed && !isActive && (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 transition-transform group-hover:translate-x-0.5" />
                )}
              </div>
            </button>
          );
        })}
      </nav>

      {/* Footer System Status Card */}
      <div className="p-4 border-t border-slate-800/60 bg-slate-900/40">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-slate-400 text-[11px]">Backend API</span>
          <span className="text-emerald-400 text-[11px] font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            {liveHealth?.latency || 32}ms Latency
          </span>
        </div>
        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
          <div className="bg-emerald-500 h-full rounded-full" style={{ width: '99.98%' }} />
        </div>
        <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between">
          <span>MongoDB Atlas Connected</span>
          <span>QA Desk Online</span>
        </div>
      </div>
    </aside>
  );
}
