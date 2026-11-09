import React from 'react';
import { useApp } from './context/AppContext';
import Header from './components/common/Header';
import Sidebar from './components/common/Sidebar';
import OverviewDashboard from './components/dashboard/OverviewDashboard';
import DoctorVerification from './components/doctors/DoctorVerification';
import RBACManagement from './components/rbac/RBACManagement';
import HiringPositions from './components/hiring/HiringPositions';
import InfluencerHub from './components/influencers/InfluencerHub';
import AppControlCenter from './components/appControl/AppControlCenter';
import AppMonitoring from './components/monitoring/AppMonitoring';
import AuditLogs from './components/audit/AuditLogs';
import { AlertCircle, Info, AlertTriangle } from 'lucide-react';

function MainContent() {
  const { activeTab, appControls } = useApp();

  return (
    <div className="flex-1 min-w-0 flex flex-col h-[calc(100vh-4rem)] overflow-y-auto">
      {/* Global In-App Broadcast Banner if enabled */}
      {appControls.banner.enabled && (
        <div className={`px-6 py-2.5 flex items-center justify-between text-xs font-medium border-b ${
          appControls.banner.type === 'alert'
            ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
            : appControls.banner.type === 'warning'
            ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
            : 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300'
        }`}>
          <div className="flex items-center gap-2">
            {appControls.banner.type === 'alert' ? (
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            ) : appControls.banner.type === 'warning' ? (
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-indigo-400 flex-shrink-0" />
            )}
            <span>
              <strong>System Notice ({appControls.banner.audience.toUpperCase()}):</strong> {appControls.banner.text}
            </span>
          </div>
        </div>
      )}

      {/* Dynamic Content Views */}
      <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
        {activeTab === 'dashboard' && <OverviewDashboard />}
        {activeTab === 'doctors' && <DoctorVerification />}
        {activeTab === 'rbac' && <RBACManagement />}
        {activeTab === 'hiring' && <HiringPositions />}
        {activeTab === 'influencers' && <InfluencerHub />}
        {activeTab === 'app_control' && <AppControlCenter />}
        {activeTab === 'monitoring' && <AppMonitoring />}
        {activeTab === 'audit' && <AuditLogs />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <MainContent />
      </div>
    </div>
  );
}
