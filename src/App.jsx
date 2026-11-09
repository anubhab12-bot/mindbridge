import React from 'react';
import { useApp } from './context/AppContext';
import Header from './components/common/Header';
import Sidebar from './components/common/Sidebar';
import OverviewDashboard from './components/dashboard/OverviewDashboard';
import BugTicketDesk from './components/bugs/BugTicketDesk';
import DoctorVerification from './components/doctors/DoctorVerification';
import RBACManagement from './components/rbac/RBACManagement';
import HiringPositions from './components/hiring/HiringPositions';
import InfluencerHub from './components/influencers/InfluencerHub';
import AppControlCenter from './components/appControl/AppControlCenter';
import AppMonitoring from './components/monitoring/AppMonitoring';
import AuditLogs from './components/audit/AuditLogs';
import { AlertCircle, Info, RotateCcw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('MindBridge Admin Portal Error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold">MindBridge Portal Recovery</h2>
            <p className="text-xs text-slate-400">
              {this.state.error?.message || 'An unexpected UI state occurred. Resetting local cache will restore portal connectivity.'}
            </p>
            <button
              onClick={() => {
                localStorage.clear();
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister()));
                }
                window.location.reload();
              }}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 mx-auto transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset & Reload App</span>
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function MainContent() {
  const { activeTab, appControls, liveSettings } = useApp();

  const banner = liveSettings?.announcementBanner || appControls?.banner || {
    enabled: true,
    title: '🌟 National Crisis Network Active',
    message: '24/7 Verified Crisis Lines Active: Tele-MANAS (14416) & Kiran (1800-599-0019) are free and confidential across India.',
    badgeType: 'info',
  };

  return (
    <div className="flex-1 min-w-0 flex flex-col h-[calc(100vh-4rem)] overflow-y-auto">
      {/* Global In-App Broadcast Banner if enabled */}
      {banner?.enabled && (
        <div className={`px-6 py-2.5 flex items-center justify-between text-xs font-medium border-b ${
          banner.badgeType === 'alert' || banner.type === 'alert'
            ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
            : banner.badgeType === 'warning' || banner.type === 'warning'
            ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
            : 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300'
        }`}>
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-indigo-400 flex-shrink-0" />
            <span>
              <strong>{banner.title || 'System Notice'}:</strong> {banner.message || banner.text}
            </span>
          </div>
        </div>
      )}

      {/* Dynamic Content Views */}
      <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
        {activeTab === 'dashboard' && <OverviewDashboard />}
        {activeTab === 'bugs' && <BugTicketDesk />}
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
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <Header />
        <div className="flex-1 flex overflow-hidden">
          <Sidebar />
          <MainContent />
        </div>
      </div>
    </ErrorBoundary>
  );
}
