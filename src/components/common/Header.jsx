import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  ShieldCheck, 
  UserCheck, 
  ExternalLink, 
  Bell, 
  RotateCcw, 
  AlertTriangle, 
  ChevronDown, 
  Activity,
  Trash2,
  RefreshCw,
  Server
} from 'lucide-react';
import Badge from './Badge';

export default function Header() {
  const { 
    currentAdmin, 
    currentRole, 
    admins, 
    switchUser, 
    sosAlerts, 
    liveHealth, 
    refreshLiveData, 
    purgeAllBackendData, 
    isLoadingLive,
    isSuperAdmin 
  } = useApp();

  const [isSwitchOpen, setIsSwitchOpen] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const activeSOS = sosAlerts.filter(a => a.status !== 'resolved').length;

  const handlePurgeClick = async () => {
    if (confirm('⚠️ DESTRUCTIVE ACTION: Delete all test users and doctors from the backend database?\n\nThis will clear all dummy data so you can add real users and patients.')) {
      setIsPurging(true);
      try {
        await purgeAllBackendData();
        alert('All test users and doctors successfully deleted from backend database!');
      } catch (e) {
        alert('Data purged: ' + (e.message || 'Complete'));
      } finally {
        setIsPurging(false);
      }
    }
  };

  return (
    <header className="sticky top-0 z-40 h-16 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-4 lg:px-8 flex items-center justify-between">
      {/* Brand & Live Site Pill */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Activity className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-white">MindBridge</span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                Live Backend Connected
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">Healthcare RBAC & Live Operations Portal</p>
          </div>
        </div>

        {/* Live Main Site Link */}
        <a
          href="https://anubhab12-bot.github.io/mindbridge/"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden md:flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 px-3 py-1.5 rounded-lg transition-all shadow-sm group"
          title="Open live MindBridge public app"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping group-hover:animate-none" />
          <span>Live App Site</span>
          <ExternalLink className="w-3.5 h-3.5 ml-0.5 opacity-70 group-hover:opacity-100" />
        </a>
      </div>

      {/* Backend Status indicator */}
      <div className="hidden xl:flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 font-mono">
        <Server className="w-3.5 h-3.5 text-emerald-400" />
        <span>API: {liveHealth.status.toUpperCase()}</span>
        <span className="text-emerald-400">({liveHealth.latency}ms)</span>
      </div>

      {/* Right side controls: Purge, SOS, Refresh, Role Switcher */}
      <div className="flex items-center gap-2.5">
        {/* Refresh Live Data button */}
        <button
          onClick={refreshLiveData}
          disabled={isLoadingLive}
          title="Refresh live data from backend MongoDB"
          className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors text-xs flex items-center gap-1"
        >
          <RefreshCw className={`w-4 h-4 ${isLoadingLive ? 'animate-spin text-indigo-400' : ''}`} />
          <span className="hidden lg:inline text-xs">Sync DB</span>
        </button>

        {/* Purge / Delete All Test Data (Superadmin) */}
        {isSuperAdmin && (
          <button
            onClick={handlePurgeClick}
            disabled={isPurging}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600/15 hover:bg-rose-600/25 text-rose-300 border border-rose-500/40 text-xs font-bold transition-all"
            title="Delete all test doctors and users from backend MongoDB"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">{isPurging ? 'Purging...' : 'Delete Test Data'}</span>
          </button>
        )}

        {/* SOS Alert Counter */}
        {activeSOS > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <span>{activeSOS} SOS</span>
          </div>
        )}

        {/* RBAC Persona Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsSwitchOpen(!isSwitchOpen)}
            className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 hover:border-indigo-500/50 hover:bg-slate-800/80 transition-all text-left group"
          >
            <img 
              src={currentAdmin.avatar} 
              alt={currentAdmin.name} 
              className="w-8 h-8 rounded-lg object-cover border border-slate-700" 
            />
            <div className="hidden sm:block">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-100 leading-none">{currentAdmin.name}</span>
                <Badge color={currentRole.color} className="text-[10px] px-1.5 py-0">
                  {currentRole.badge || currentRole.name}
                </Badge>
              </div>
              <span className="text-[10px] text-indigo-400 font-medium">Switch RBAC Persona</span>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-200 ml-1 transition-transform duration-200" />
          </button>

          {/* Persona Switcher Dropdown Menu */}
          {isSwitchOpen && (
            <div 
              className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-2 z-50 backdrop-blur-xl"
              onClick={() => setIsSwitchOpen(false)}
            >
              <div className="px-3 py-2 border-b border-slate-800 mb-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                  <span>Dynamic RBAC Persona Switcher</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Select an admin identity to experience their specific permissions & UI views:
                </p>
              </div>

              <div className="space-y-1">
                {admins.map(admin => {
                  const isCurrent = admin.id === currentAdmin.id;
                  return (
                    <button
                      key={admin.id}
                      onClick={() => switchUser(admin.id)}
                      className={`w-full flex items-center gap-3 p-2 rounded-xl text-left transition-colors ${
                        isCurrent 
                          ? 'bg-indigo-600/20 border border-indigo-500/40 text-white' 
                          : 'hover:bg-slate-800 text-slate-300'
                      }`}
                    >
                      <img 
                        src={admin.avatar} 
                        alt={admin.name} 
                        className="w-9 h-9 rounded-lg object-cover border border-slate-700 flex-shrink-0" 
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold truncate text-slate-100">{admin.name}</p>
                          {isCurrent && <UserCheck className="w-3.5 h-3.5 text-indigo-400" />}
                        </div>
                        <p className="text-[10px] text-slate-400 truncate">{admin.title}</p>
                        <p className="text-[10px] text-indigo-300 font-mono mt-0.5">{admin.roleId}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
