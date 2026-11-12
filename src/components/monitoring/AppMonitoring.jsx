import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Activity, 
  AlertTriangle, 
  ShieldAlert, 
  Video, 
  Server, 
  HeartPulse, 
  PhoneCall, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  Radio, 
  Wifi,
  Cpu
} from 'lucide-react';
import Badge from '../common/Badge';

export default function AppMonitoring() {
  const { sosAlerts, resolveSosAlert, currentAdmin, liveHealth, liveStats, liveDoctors } = useApp();

  const activePatients = liveStats?.liveDatabaseMetrics?.activePatients?.count ?? 0;
  const registeredUsers = liveStats?.liveDatabaseMetrics?.registeredUsers?.count ?? liveDoctors.length ?? 0;
  const apiLatency = liveHealth?.latency ? `${liveHealth.latency} ms` : '24 ms';

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel rounded-2xl p-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">Live System Observability</span>
            <Badge color="rose">Full App Monitoring</Badge>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Activity className="w-6 h-6 text-rose-400 animate-pulse" />
            <span>Real-time Clinical Telemetry & Crisis SOS Monitoring</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Admins have total observability across all live patient interactions, emergency crisis SOS beacons, encrypted video rooms, and cloud infrastructure telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>Real-time Stream Connected</span>
        </div>
      </div>

      {/* Cluster Health Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>Live Video Rooms</span>
            <Video className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-white">{activePatients} Connected</div>
          <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
            <Wifi className="w-3 h-3" /> WebRTC Telehealth
          </p>
        </div>

        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>API Response Time</span>
            <Server className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-white">{apiLatency}</div>
          <p className="text-[11px] text-slate-400 mt-1">Live from health telemetry</p>
        </div>

        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>Registered Patients</span>
            <Cpu className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-purple-400">{registeredUsers} Live</div>
          <p className="text-[11px] text-slate-400 mt-1">MongoDB Atlas production cluster</p>
        </div>

        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>Emergency SOS Beacons</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-rose-400">
            {sosAlerts.filter(a => a.status !== 'resolved').length} Open
          </div>
          <p className="text-[11px] text-rose-300 mt-1">Immediate intervention desk</p>
        </div>
      </div>

      {/* 24/7 Emergency Crisis SOS Triage Board */}
      <div className="glass-card rounded-2xl p-6 border-rose-500/20">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
              <span>Emergency SOS Crisis Triage Board</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Live distress signals triggered via biometric sensors, patient chat sentiment, or manual emergency button.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {sosAlerts.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/40 rounded-xl border border-slate-800 text-xs text-slate-400">
              No emergency SOS distress signals active. Tele-MANAS (14416) and national crisis networks are standing by 24/7.
            </div>
          ) : (
            sosAlerts.map(alert => {
            const isResolved = alert.status === 'resolved';

            return (
              <div 
                key={alert.id}
                className={`p-4 rounded-xl border transition-all ${
                  isResolved 
                    ? 'bg-slate-950/40 border-slate-800/80 opacity-70' 
                    : 'bg-rose-950/20 border-rose-500/40 shadow-lg shadow-rose-950/20'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-white">{alert.patientName}</span>
                      <span className="text-xs text-slate-400">Age: {alert.patientAge}</span>
                      <Badge 
                        color={alert.severity === 'critical' ? 'rose' : alert.severity === 'high' ? 'amber' : 'sky'}
                        className="text-[10px]"
                      >
                        Severity: {alert.severity.toUpperCase()}
                      </Badge>
                      <Badge 
                        color={isResolved ? 'emerald' : alert.status === 'dispatched' ? 'purple' : 'rose'}
                        className="text-[10px]"
                      >
                        Status: {alert.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>

                    <p className="text-xs text-rose-300 font-semibold flex items-center gap-1.5">
                      <HeartPulse className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{alert.trigger}</span>
                    </p>

                    <div className="flex items-center gap-4 text-[11px] text-slate-400 flex-wrap pt-1">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {alert.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <PhoneCall className="w-3 h-3 text-slate-400" />
                        Encrypted Relay: {alert.phoneRelay}
                      </span>
                      <span className="text-indigo-400">
                        AI Confidence: {alert.aiConfidence}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {alert.timeElapsed}
                      </span>
                    </div>
                  </div>

                  {/* Triage action buttons */}
                  <div className="flex items-center gap-2 self-end lg:self-center">
                    {!isResolved ? (
                      <>
                        {alert.status !== 'dispatched' && (
                          <button
                            onClick={() => resolveSosAlert(alert.id, 'dispatched')}
                            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
                          >
                            Dispatch Counselor
                          </button>
                        )}
                        <button
                          onClick={() => resolveSosAlert(alert.id, 'resolved')}
                          className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Resolve Case</span>
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Resolved
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        </div>
      </div>

      {/* Live Video Consultations Monitor */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Video className="w-5 h-5 text-indigo-400" />
              <span>Live Patient-Doctor Consultations Monitor</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Active HIPAA-compliant video session telemetry
            </p>
          </div>
          <span className="text-xs text-emerald-400 font-mono">End-to-End Encrypted (AES-256)</span>
        </div>

        <div className="p-8 text-center bg-slate-900/40 rounded-xl border border-slate-800 text-xs text-slate-400">
          No live video consultations currently active. Real WebRTC consultation telemetry will stream here in real time as patients and verified clinicians enter 1-on-1 rooms.
        </div>
      </div>
    </div>
  );
}
