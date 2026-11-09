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
  Sparkles,
  Activity
} from 'lucide-react';
import Badge from './Badge';

export default function Header() {
  const { 
    currentAdmin, 
    currentRole, 
    admins, 
    switchUser, 
    sosAlerts, 
    resetToDefaults, 
    appControls 
  } = useApp();

  const [isSwitchOpen, setIsSwitchOpen] = useState(false);
  const activeSOS = sosAlerts.filter(a => a.status !== 'resolved').length;

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
              <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.5 rounded">
                Dynamic Admin
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">Healthcare RBAC & Real-time Operations Portal</p>
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

      {/* Global Banner Notice if enabled */}
      {appControls.maintenanceMode && (
        <div className="hidden xl:flex items-center gap-2 px-3 py-1 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-300 text-xs font-semibold animate-pulse">
          <AlertTriangle className="w-4 h-4 text-rose-400" />
          <span>MAINTENANCE MODE ACTIVE</span>
        </div>
      )}

      {/* Right side controls: SOS pill, Role Switcher, Admin Profile */}
      <div className="flex items-center gap-3">
        {/* SOS Alert Counter */}
        {activeSOS > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <span>{activeSOS} SOS Crisis Active</span>
          </div>
        )}

        {/* Demo reset button */}
        <button
          onClick={() => {
            if (confirm('Reset all demo data (doctors, campaigns, roles) to initial state?')) {
              resetToDefaults();
            }
          }}
          title="Reset sample data"
          className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors text-xs flex items-center gap-1.5"
        >
          <RotateCcw className="w-4 h-4" />
          <span className="hidden lg:inline text-xs">Reset</span>
        </button>

        {/* RBAC Persona Switcher Dropdown (Crucial for testing all user roles!) */}
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
