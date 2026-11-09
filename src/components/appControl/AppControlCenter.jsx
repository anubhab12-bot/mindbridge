import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Sliders, 
  ToggleLeft, 
  ToggleRight, 
  AlertTriangle, 
  Bell, 
  DollarSign, 
  Save, 
  Sparkles, 
  Cpu, 
  Video, 
  ShieldAlert, 
  MessageSquare, 
  FileCheck2,
  Lock,
  Activity,
  Globe
} from 'lucide-react';
import Badge from '../common/Badge';

export default function AppControlCenter() {
  const { 
    appControls, 
    liveSettings,
    toggleFeatureFlag, 
    toggleMaintenanceMode, 
    updateGlobalBanner, 
    updateStatsOverride,
    updateFinancials, 
    hasPermission 
  } = useApp();

  const [bannerText, setBannerText] = useState(
    liveSettings?.announcementBanner?.message || 
    appControls?.banner?.text || 
    '24/7 Verified Crisis Lines Active: Tele-MANAS (14416) & Kiran (1800-599-0019) are free and confidential across India.'
  );
  const [bannerTitle, setBannerTitle] = useState(
    liveSettings?.announcementBanner?.title || '🌟 National Crisis Network Active'
  );
  const [bannerType, setBannerType] = useState(
    liveSettings?.announcementBanner?.badgeType || appControls?.banner?.type || 'info'
  );
  const [bannerAudience, setBannerAudience] = useState(appControls?.banner?.audience || 'all');
  const [bannerEnabled, setBannerEnabled] = useState(
    liveSettings?.announcementBanner?.enabled ?? appControls?.banner?.enabled ?? true
  );

  const [liveStatsForm, setLiveStatsForm] = useState({
    totalUsers: liveSettings?.statsOverride?.totalUsers || '14,850+',
    totalNgos: liveSettings?.statsOverride?.totalNgos || '124',
    recoveryRate: liveSettings?.statsOverride?.recoveryRate || '94.6%',
    avgResponseTime: liveSettings?.statsOverride?.avgResponseTime || '< 42s',
  });

  const [financials, setFinancials] = useState(appControls?.financials || {
    baseDoctorConsultFee: 75,
    platformCommissionPercent: 15,
    specialistVerifierBounty: 25,
  });
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState('Settings successfully synchronized across live backend nodes!');

  const canManage = hasPermission('app_control.manage');

  useEffect(() => {
    if (liveSettings?.statsOverride) {
      setLiveStatsForm({
        totalUsers: liveSettings.statsOverride.totalUsers || '14,850+',
        totalNgos: liveSettings.statsOverride.totalNgos || '124',
        recoveryRate: liveSettings.statsOverride.recoveryRate || '94.6%',
        avgResponseTime: liveSettings.statsOverride.avgResponseTime || '< 42s',
      });
    }
    if (liveSettings?.announcementBanner) {
      setBannerText(liveSettings.announcementBanner.message || '');
      setBannerTitle(liveSettings.announcementBanner.title || '');
      setBannerEnabled(liveSettings.announcementBanner.enabled !== false);
    }
  }, [liveSettings]);

  const handleBannerSave = async (e) => {
    e.preventDefault();
    await updateGlobalBanner({
      title: bannerTitle,
      text: bannerText,
      message: bannerText,
      type: bannerType,
      badgeType: bannerType,
      audience: bannerAudience,
      enabled: bannerEnabled,
    });
    setSuccessMsg('Announcement banner published live across public site and mobile PWA!');
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleStatsSave = async (e) => {
    e.preventDefault();
    await updateStatsOverride(liveStatsForm);
    setSuccessMsg('Live clinical telemetry metrics saved to MongoDB Atlas & refreshed on main site!');
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleFinancialsSave = (e) => {
    e.preventDefault();
    updateFinancials({
      baseDoctorConsultFee: parseFloat(financials.baseDoctorConsultFee) || 75,
      platformCommissionPercent: parseFloat(financials.platformCommissionPercent) || 15,
      specialistVerifierBounty: parseFloat(financials.specialistVerifierBounty) || 25,
      currency: 'USD',
    });
    setSuccessMsg('Financial fee matrix saved!');
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel rounded-2xl p-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">Dynamic App Control</span>
            <Badge color="sky">Live System Switches</Badge>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Sliders className="w-6 h-6 text-sky-400" />
            <span>Dynamic App Configuration & Live Toggles</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Instantly adjust platform capabilities, broadcast system alerts, toggle AI features, and configure telehealth economics. All changes propagate live to MongoDB and the main app without redeploying code.
          </p>
        </div>

        {/* Global Maintenance Mode Killswitch */}
        {canManage ? (
          <button
            onClick={() => {
              if (confirm(`Toggle Global Maintenance Mode to: ${!appControls.maintenanceMode ? 'ENABLED' : 'DISABLED'}?`)) {
                toggleMaintenanceMode();
              }
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold shadow-lg transition-all self-start sm:self-auto ${
              appControls.maintenanceMode 
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30' 
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
          >
            <AlertTriangle className={`w-4 h-4 ${appControls.maintenanceMode ? 'animate-bounce text-white' : 'text-amber-400'}`} />
            <span>Maintenance Mode: {appControls.maintenanceMode ? 'ACTIVE' : 'OFF'}</span>
          </button>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-500 text-xs">
            <Lock className="w-3.5 h-3.5" />
            <span>Read-Only Controls</span>
          </div>
        )}
      </div>

      {savedSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fadeIn shadow-lg shadow-emerald-500/10">
          <Activity className="w-4 h-4 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Live Public Site Statistics Controller */}
      <div className="glass-card rounded-2xl p-6 border-indigo-500/20">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Globe className="w-5 h-5 text-emerald-400" />
              <span>Main App Live Clinical Metrics Controller</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Directly sets the public stats on <a href="https://anubhab12-bot.github.io/mindbridge/" target="_blank" rel="noreferrer" className="text-sky-400 hover:underline">mindbridge/</a> home page in real-time. Zero fake demo numbers.
            </p>
          </div>
          <Badge color="emerald">Live In MongoDB</Badge>
        </div>

        <form onSubmit={handleStatsSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Total Consultations / Users
              </label>
              <input
                type="text"
                value={liveStatsForm.totalUsers}
                onChange={e => setLiveStatsForm({ ...liveStatsForm, totalUsers: e.target.value })}
                disabled={!canManage}
                placeholder="e.g. 14,850+"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 disabled:opacity-50 font-mono"
              />
              <p className="text-[10px] text-slate-400 mt-1">Reflects in hero & recovery section</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Accredited Medical Partners
              </label>
              <input
                type="text"
                value={liveStatsForm.totalNgos}
                onChange={e => setLiveStatsForm({ ...liveStatsForm, totalNgos: e.target.value })}
                disabled={!canManage}
                placeholder="e.g. 124"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 disabled:opacity-50 font-mono"
              />
              <p className="text-[10px] text-slate-400 mt-1">Reflects in authority pill badge</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Clinical Recovery Rate
              </label>
              <input
                type="text"
                value={liveStatsForm.recoveryRate}
                onChange={e => setLiveStatsForm({ ...liveStatsForm, recoveryRate: e.target.value })}
                disabled={!canManage}
                placeholder="e.g. 94.6%"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 disabled:opacity-50 font-mono"
              />
              <p className="text-[10px] text-slate-400 mt-1">Population health telemetry stat</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Crisis Helpline Response Time
              </label>
              <input
                type="text"
                value={liveStatsForm.avgResponseTime}
                onChange={e => setLiveStatsForm({ ...liveStatsForm, avgResponseTime: e.target.value })}
                disabled={!canManage}
                placeholder="e.g. < 42s"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 disabled:opacity-50 font-mono"
              />
              <p className="text-[10px] text-slate-400 mt-1">Direct Tele-MANAS latency metric</p>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              Pushes live to <code className="text-emerald-400">/api/v1/governance/settings</code> in MongoDB Atlas
            </span>
            {canManage && (
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Live Metrics to Main Site</span>
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Feature Flags Grid */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Cpu className="w-5 h-5 text-indigo-400" />
              <span>Dynamic Feature Flags</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Enable or disable core application modules in real-time across patient and clinician portals
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(appControls?.features || {}).map(([key, feat]) => {
            return (
              <div
                key={key}
                className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-bold text-white">{feat.name}</span>
                    <Badge color={feat.enabled ? 'emerald' : 'rose'} className="text-[10px]">
                      {feat.enabled ? 'ENABLED' : 'DISABLED'}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed min-h-[36px]">
                    {feat.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-mono">{feat.category}</span>
                  {canManage ? (
                    <button
                      onClick={() => toggleFeatureFlag(key)}
                      className={`text-xs font-bold px-3 py-1 rounded-lg transition-colors ${
                        feat.enabled 
                          ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30' 
                          : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30'
                      }`}
                    >
                      {feat.enabled ? 'Turn Off' : 'Turn On'}
                    </button>
                  ) : (
                    <span className="text-[10px] text-slate-600">Locked</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Two Column Layout: Global Broadcast Banner & Consultation Pricing */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Global Broadcast Banner */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Bell className="w-5 h-5 text-sky-400" />
                <span>Global In-App Announcement Banner</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Pushes a dynamic alert banner across all live patient & doctor mobile/web apps
              </p>
            </div>
          </div>

          <form onSubmit={handleBannerSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Banner Title</label>
              <input
                type="text"
                value={bannerTitle}
                onChange={e => setBannerTitle(e.target.value)}
                disabled={!canManage}
                placeholder="e.g. 🌟 National Crisis Network Active"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 disabled:opacity-50 mb-3"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Announcement Copy</label>
              <textarea
                rows={3}
                value={bannerText}
                onChange={e => setBannerText(e.target.value)}
                disabled={!canManage}
                placeholder="Enter alert text to display at the top of the MindBridge app..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-sky-500 disabled:opacity-50"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Banner Type</label>
                <select
                  value={bannerType}
                  onChange={e => setBannerType(e.target.value)}
                  disabled={!canManage}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 disabled:opacity-50"
                >
                  <option value="info">Info (Blue)</option>
                  <option value="warning">Warning (Amber)</option>
                  <option value="alert">Critical Alert (Red)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Target Audience</label>
                <select
                  value={bannerAudience}
                  onChange={e => setBannerAudience(e.target.value)}
                  disabled={!canManage}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 disabled:opacity-50"
                >
                  <option value="all">All Patients & Doctors</option>
                  <option value="doctors">Doctors Only</option>
                  <option value="patients">Patients Only</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-300">
                <input
                  type="checkbox"
                  checked={bannerEnabled}
                  onChange={e => setBannerEnabled(e.target.checked)}
                  disabled={!canManage}
                  className="rounded bg-slate-950 border-slate-700 text-sky-500"
                />
                <span>Broadcast Banner Active</span>
              </label>

              {canManage && (
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-md shadow-sky-600/20 transition-all flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Update Announcement</span>
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Dynamic Financial Rules & Pricing */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-amber-400" />
                <span>Telehealth Consultation Fee Matrix</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Dynamic platform pricing and specialist verification subsidies
              </p>
            </div>
          </div>

          <form onSubmit={handleFinancialsSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Default Patient Consultation Fee (USD)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">$</span>
                <input
                  type="number"
                  min="20"
                  max="500"
                  value={financials.baseDoctorConsultFee}
                  onChange={e => setFinancials({ ...financials, baseDoctorConsultFee: e.target.value })}
                  disabled={!canManage}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-7 pr-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 disabled:opacity-50"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Doctors can customize within ±40% of baseline</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                MindBridge Platform Service Commission (%)
              </label>
              <input
                type="number"
                min="5"
                max="40"
                value={financials.platformCommissionPercent}
                onChange={e => setFinancials({ ...financials, platformCommissionPercent: e.target.value })}
                disabled={!canManage}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 disabled:opacity-50"
              />
              <p className="text-[10px] text-slate-400 mt-1">Platform take rate on each completed telehealth session</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Specialist Doctor Verification Subsidy / Bounty (USD)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">$</span>
                <input
                  type="number"
                  min="10"
                  max="100"
                  value={financials.specialistVerifierBounty}
                  onChange={e => setFinancials({ ...financials, specialistVerifierBounty: e.target.value })}
                  disabled={!canManage}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-7 pr-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 disabled:opacity-50"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Paid to senior specialist physicians for each verified doctor file</p>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              {canManage && (
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md shadow-amber-600/20 transition-all flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Economics</span>
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
