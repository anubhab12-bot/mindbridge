import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  FileText, 
  Search, 
  ShieldCheck, 
  Download, 
  Calendar, 
  Filter, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';
import Badge from '../common/Badge';

export default function AuditLogs() {
  const { auditLogs } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = 
      log.adminName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAction = actionFilter === 'all' || log.action.includes(actionFilter.toUpperCase());
    return matchesSearch && matchesAction;
  });

  const exportAsJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(auditLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `mindbridge_audit_logs_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel rounded-2xl p-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Compliance & Security Trail</span>
            <Badge color="indigo">ISO-27799 / HIPAA</Badge>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-400" />
            <span>Immutable Administrative Audit Logs</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Every privileged action—doctor credential approvals, role creation, staff hiring, and dynamic feature flag toggles—is immutably timestamped for regulatory compliance.
          </p>
        </div>

        <button
          onClick={exportAsJson}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all self-start sm:self-auto"
        >
          <Download className="w-4 h-4 text-indigo-400" />
          <span>Export Compliance Trail</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search action, administrator, details..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Action Categories</option>
            <option value="DOCTOR">Doctor Verification</option>
            <option value="ROLE">Dynamic Roles</option>
            <option value="STAFF">Hiring & Staffing</option>
            <option value="FEATURE">Dynamic Flags</option>
            <option value="CAMPAIGN">Influencer Campaigns</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="glass-card rounded-2xl p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Administrator</th>
                <th className="py-3 px-4">Action Code</th>
                <th className="py-3 px-4">Audited Event Details</th>
                <th className="py-3 px-4 text-right">Client IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredLogs.map(log => {
                return (
                  <tr key={log.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap text-[11px]">
                      {log.timestamp}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap font-sans">
                      <div>
                        <p className="font-bold text-white text-xs">{log.adminName}</p>
                        <p className="text-[10px] text-slate-400">{log.adminRole}</p>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <Badge color={log.badge || 'indigo'} className="font-mono text-[10px]">
                        {log.action}
                      </Badge>
                    </td>

                    <td className="py-3.5 px-4 font-sans text-xs text-slate-300 min-w-[280px]">
                      {log.details}
                    </td>

                    <td className="py-3.5 px-4 text-right text-slate-400 text-[11px]">
                      {log.ip}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
