import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Bug, 
  Plus, 
  Filter, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle, 
  Send, 
  Mail, 
  ExternalLink, 
  Copy, 
  Check, 
  Smartphone, 
  Terminal, 
  Layers, 
  RotateCcw,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import Badge from '../common/Badge';
import Modal from '../common/Modal';
import { emailService, SUPER_CREATOR_EMAIL, SUPER_CREATOR_NAME } from '../../services/emailService';

export default function BugTicketDesk() {
  const { 
    bugTickets = [], 
    addBugTicket, 
    updateBugStatus, 
    currentAdmin, 
    currentRole, 
    isSuperAdmin,
    hasPermission 
  } = useApp();

  const [activeStatusFilter, setActiveStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedTicketForEmail, setSelectedTicketForEmail] = useState(null);
  const [emailNotificationData, setEmailNotificationData] = useState(null);
  const [resolutionInput, setResolutionInput] = useState('');
  const [pendingStatusChange, setPendingStatusChange] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // New Bug Ticket Form
  const [newBug, setNewBug] = useState({
    title: '',
    component: 'Video Telehealth',
    severity: 'high',
    device: navigator.userAgent.includes('Windows') ? 'Chrome on Windows 11' : 'Mobile Web Browser',
    stepsToReproduce: '',
    expectedBehavior: '',
    actualBehavior: '',
  });

  const isTester = currentRole?.id === 'tester_user' || hasPermission('bugs.create') || isSuperAdmin;

  const filteredTickets = (bugTickets || []).filter(ticket => {
    if (!ticket) return false;
    const matchesStatus = activeStatusFilter === 'all' || ticket.status === activeStatusFilter;
    const matchesSearch = 
      (ticket.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ticket.id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ticket.component || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ticket.reportedBy || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Handle reporting new bug
  const handleReportBug = (e) => {
    e.preventDefault();
    if (!newBug.title) return;

    addBugTicket({
      title: newBug.title,
      component: newBug.component,
      severity: newBug.severity,
      device: newBug.device,
      stepsToReproduce: newBug.stepsToReproduce || '1. Open app\n2. Perform test scenario',
      expectedBehavior: newBug.expectedBehavior || 'Feature should function normally',
      actualBehavior: newBug.actualBehavior || 'Encountered error/unexpected behavior',
      reportedBy: `${currentAdmin.name} (${currentRole.badge || currentRole.name})`,
      testerEmail: currentAdmin.email || 'tester@mindbridge.health',
    });

    setIsReportModalOpen(false);
    setNewBug({
      title: '',
      component: 'Video Telehealth',
      severity: 'high',
      device: 'Chrome on Windows 11',
      stepsToReproduce: '',
      expectedBehavior: '',
      actualBehavior: '',
    });
  };

  // When changing status to 'fixed' or 'cant_fix', prompt email notification
  const handleStatusChangeRequest = (ticket, newStatus) => {
    if (newStatus === 'fixed' || newStatus === 'cant_fix') {
      const emailPayload = emailService.generateBugStatusNotification({
        ticket,
        newStatus,
        resolutionNotes: ticket.resolutionNotes || (newStatus === 'fixed' ? 'Code fix deployed and ready for QA retest.' : 'Marked as unfixable or expected platform behavior.'),
      });
      setSelectedTicketForEmail(ticket);
      setPendingStatusChange(newStatus);
      setEmailNotificationData(emailPayload);
      setResolutionInput(ticket.resolutionNotes || '');
    } else {
      updateBugStatus(ticket.id, newStatus, ticket.resolutionNotes);
    }
  };

  const handleConfirmEmailAndStatus = () => {
    if (!selectedTicketForEmail || !pendingStatusChange) return;

    updateBugStatus(selectedTicketForEmail.id, pendingStatusChange, resolutionInput);
    setSelectedTicketForEmail(null);
    setEmailNotificationData(null);
    setPendingStatusChange(null);
    setResolutionInput('');
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openMailto = (url) => {
    window.open(url, '_blank');
  };

  // Counts
  const counts = {
    all: bugTickets.length,
    open: bugTickets.filter(t => t.status === 'open').length,
    in_progress: bugTickets.filter(t => t.status === 'in_progress').length,
    fixed: bugTickets.filter(t => t.status === 'fixed').length,
    cant_fix: bugTickets.filter(t => t.status === 'cant_fix').length,
    verified: bugTickets.filter(t => t.status === 'verified').length,
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel rounded-2xl p-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-teal-400 uppercase tracking-wider">Quality Assurance & Issue Tracking</span>
            <Badge color="teal">QA Bug Desk</Badge>
            {isSuperAdmin && <Badge color="rose">Super Creator Authority</Badge>}
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Bug className="w-6 h-6 text-teal-400" />
            <span>Bug Tickets & Application Task Bar</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Testers raise bug tickets with unique tracking IDs while checking the live app. When an issue is moved to <strong>Fixed</strong> or <strong>Can't Fix</strong> on the task bar, an automated retest notification email is dispatched to the tester from <strong>{SUPER_CREATOR_EMAIL}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <a
            href="https://anubhab12-bot.github.io/mindbridge/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all"
            title="Open live app to test"
          >
            <ExternalLink className="w-3.5 h-3.5 text-teal-400" />
            <span>Open App for QA</span>
          </a>

          {isTester && (
            <button
              onClick={() => setIsReportModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-lg shadow-teal-600/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Raise Bug Ticket</span>
            </button>
          )}
        </div>
      </div>

      {/* Task Bar / Status Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by Ticket ID (e.g. MB-BUG-101), component, title..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
        </div>

        {/* Task Bar Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All Tickets', count: counts.all, color: 'indigo' },
            { id: 'open', label: 'Open', count: counts.open, color: 'slate' },
            { id: 'in_progress', label: 'In Progress', count: counts.in_progress, color: 'sky' },
            { id: 'fixed', label: 'Fixed (Resolved)', count: counts.fixed, color: 'emerald' },
            { id: 'cant_fix', label: "Can't Fix", count: counts.cant_fix, color: 'rose' },
            { id: 'verified', label: 'Retested & Closed', count: counts.verified, color: 'teal' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeStatusFilter === tab.id
                  ? 'bg-teal-600 text-white font-bold shadow-md shadow-teal-600/25'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeStatusFilter === tab.id ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Bug Tickets Task Bar Grid */}
      {filteredTickets.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center mx-auto">
            <Bug className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-white">No Bug Tickets in this Task Bar filter</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            The app is currently clean in this category or no issues match your search query.
          </p>
          {isTester && (
            <button
              onClick={() => setIsReportModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold transition-all mt-2"
            >
              <Plus className="w-4 h-4" />
              <span>Raise Bug Ticket as Tester</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTickets.map(ticket => {
            const isFixed = ticket.status === 'fixed';
            const isCantFix = ticket.status === 'cant_fix';
            const isVerified = ticket.status === 'verified';

            return (
              <div 
                key={ticket.id}
                className="glass-card p-5 rounded-2xl flex flex-col xl:flex-row xl:items-center justify-between gap-5 hover:border-slate-700 transition-all"
              >
                {/* Left: Ticket Core Info */}
                <div className="space-y-2.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-xs font-mono font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30 px-2 py-0.5 rounded">
                      {ticket.id}
                    </span>
                    <h3 className="text-sm font-bold text-white">{ticket.title}</h3>
                    <Badge color={ticket.severity === 'critical' ? 'rose' : ticket.severity === 'high' ? 'amber' : 'sky'} className="text-[10px]">
                      {ticket.severity.toUpperCase()}
                    </Badge>
                    <Badge color="indigo" className="text-[10px]">
                      {ticket.component}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                    <span>Reported by: <strong className="text-slate-200">{ticket.reportedBy}</strong></span>
                    <span>Email: <strong className="text-slate-300 font-mono">{ticket.testerEmail}</strong></span>
                    <span>Device: <strong className="text-slate-300">{ticket.device}</strong></span>
                    <span>Reported: {ticket.createdAt}</span>
                  </div>

                  {/* Reproduction Steps & Behavior Snippet */}
                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2 text-xs">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Steps to Reproduce:</span>
                      <pre className="font-mono text-[11px] text-slate-300 whitespace-pre-wrap leading-relaxed">
                        {ticket.stepsToReproduce}
                      </pre>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-800/60 text-[11px]">
                      <div>
                        <span className="text-emerald-400 font-semibold">Expected: </span>
                        <span className="text-slate-300">{ticket.expectedBehavior}</span>
                      </div>
                      <div>
                        <span className="text-rose-400 font-semibold">Actual: </span>
                        <span className="text-slate-300">{ticket.actualBehavior}</span>
                      </div>
                    </div>

                    {ticket.resolutionNotes && (
                      <div className="pt-1.5 border-t border-slate-800/60 text-[11px]">
                        <span className="text-indigo-300 font-semibold">Resolution / Triage Note: </span>
                        <span className="text-slate-300">{ticket.resolutionNotes}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Task Bar Status Controller & Tester Retest Desk */}
                <div className="flex flex-col sm:flex-row xl:flex-col items-start xl:items-end gap-3 flex-shrink-0 self-start xl:self-center">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block xl:text-right">Task Bar Status:</span>
                    <select
                      value={ticket.status}
                      onChange={e => handleStatusChangeRequest(ticket, e.target.value)}
                      className={`text-xs font-bold rounded-xl px-3 py-1.5 border focus:outline-none transition-all ${
                        ticket.status === 'fixed' 
                          ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40' 
                          : ticket.status === 'cant_fix' 
                          ? 'bg-rose-950/40 text-rose-300 border-rose-500/40' 
                          : ticket.status === 'verified'
                          ? 'bg-teal-950/40 text-teal-300 border-teal-500/40'
                          : ticket.status === 'in_progress'
                          ? 'bg-sky-950/40 text-sky-300 border-sky-500/40'
                          : 'bg-slate-900 text-slate-300 border-slate-700'
                      }`}
                    >
                      <option value="open">Open / Backlog</option>
                      <option value="in_progress">In Progress</option>
                      <option value="fixed">Fixed (Will Email Tester)</option>
                      <option value="cant_fix">Can't Fix (Will Email Tester)</option>
                      <option value="verified">Retested & Verified (Closed)</option>
                    </select>
                  </div>

                  {/* Actions for Tester / Superadmin when ticket is Fixed or Can't Fix */}
                  {(isFixed || isCantFix) && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <a
                        href="https://anubhab12-bot.github.io/mindbridge/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-teal-600/20 hover:bg-teal-600 text-teal-300 hover:text-white border border-teal-500/30 text-xs font-semibold transition-all flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Retest on App</span>
                      </a>

                      <button
                        onClick={() => updateBugStatus(ticket.id, 'verified', 'Retested and verified fixed on live deployment.')}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1 shadow-sm"
                        title="Close as verified"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Close Ticket</span>
                      </button>
                    </div>
                  )}

                  {isVerified && (
                    <span className="text-[11px] text-teal-400 font-semibold flex items-center gap-1 bg-teal-500/10 border border-teal-500/30 px-2.5 py-1 rounded-lg">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Retested & Closed by QA</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Raise Bug Ticket */}
      <Modal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        title="Raise Bug Ticket (Tester Desk)"
        subtitle="Report an issue found while testing the MindBridge live app"
      >
        <form onSubmit={handleReportBug} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Issue Title / Summary</label>
            <input
              type="text"
              required
              placeholder="e.g. Teleconsultation video stream disconnects after 15 mins on Safari"
              value={newBug.title}
              onChange={e => setNewBug({ ...newBug, title: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">App Module / Component</label>
              <select
                value={newBug.component}
                onChange={e => setNewBug({ ...newBug, component: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
              >
                <option value="Video Telehealth">Video Telehealth (WebRTC)</option>
                <option value="Doctor Verification">Doctor Verification Queue</option>
                <option value="Patient Booking">Patient Booking & Appointments</option>
                <option value="AI Clinical Copilot">AI Clinical Copilot & Triage</option>
                <option value="Emergency Crisis SOS">Emergency Crisis SOS Beacon</option>
                <option value="Influencer Referral">Influencer & Referral Links</option>
                <option value="Auth & RBAC">Auth, Roles & Session Tokens</option>
                <option value="Mobile UI & Styling">Mobile UI & CSS Layout</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Severity Tier</label>
              <select
                value={newBug.severity}
                onChange={e => setNewBug({ ...newBug, severity: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
              >
                <option value="critical">Critical (P0) - Blocks core clinical flow</option>
                <option value="high">High (P1) - Serious functional defect</option>
                <option value="medium">Medium (P2) - Non-blocking annoyance</option>
                <option value="low">Low (P3) - Visual / cosmetic polish</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Device & Operating Environment</label>
            <input
              type="text"
              placeholder="e.g. Chrome 131 on Windows 11 or iPhone 15 Safari"
              value={newBug.device}
              onChange={e => setNewBug({ ...newBug, device: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Steps to Reproduce</label>
            <textarea
              rows={3}
              required
              placeholder="1. Open teleconsultation room&#10;2. Click mute microphone&#10;3. Check peer connection audio..."
              value={newBug.stepsToReproduce}
              onChange={e => setNewBug({ ...newBug, stepsToReproduce: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 font-mono"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Expected Behavior</label>
              <input
                type="text"
                placeholder="What should normally happen?"
                value={newBug.expectedBehavior}
                onChange={e => setNewBug({ ...newBug, expectedBehavior: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Actual Behavior</label>
              <input
                type="text"
                placeholder="What actually went wrong?"
                value={newBug.actualBehavior}
                onChange={e => setNewBug({ ...newBug, actualBehavior: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
            <p>
              Reported as: <strong className="text-slate-200">{currentAdmin.name}</strong> ({currentAdmin.email})
            </p>
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsReportModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-lg shadow-teal-600/20 transition-all"
            >
              Raise & Assign Ticket ID
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Dispatch Email to Tester (Fixed / Can't Fix notification) */}
      <Modal
        isOpen={!!selectedTicketForEmail}
        onClose={() => {
          setSelectedTicketForEmail(null);
          setEmailNotificationData(null);
          setPendingStatusChange(null);
        }}
        title={`Status Changed to ${pendingStatusChange?.toUpperCase()}`}
        subtitle={`Dispatches notification email to Tester from ${SUPER_CREATOR_EMAIL}`}
        maxWidth="max-w-3xl"
      >
        {emailNotificationData && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Sender (Super Creator):</span>
                <span className="text-emerald-400 font-bold">{SUPER_CREATOR_EMAIL}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Recipient (Tester):</span>
                <span className="text-slate-200 font-mono">{emailNotificationData.to}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Subject:</span>
                <span className="text-slate-200 font-semibold">{emailNotificationData.subject}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Resolution / Triage Notes (Sent to Tester for Retest Guidance)
              </label>
              <textarea
                rows={3}
                value={resolutionInput}
                onChange={e => {
                  setResolutionInput(e.target.value);
                  const updatedPayload = emailService.generateBugStatusNotification({
                    ticket: selectedTicketForEmail,
                    newStatus: pendingStatusChange,
                    resolutionNotes: e.target.value,
                  });
                  setEmailNotificationData(updatedPayload);
                }}
                placeholder="Explain what was fixed, or why this issue cannot be fixed..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-teal-500"
              />
            </div>

            {/* Formatted Email Preview */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-slate-300">Email Body Preview:</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(emailNotificationData.body, 'email-preview')}
                  className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1"
                >
                  {copiedId === 'email-preview' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copy Email Text</span>
                </button>
              </div>
              <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300 font-mono whitespace-pre-wrap max-h-56 overflow-y-auto leading-relaxed">
                {emailNotificationData.body}
              </pre>
            </div>

            <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => openMailto(emailNotificationData.mailtoUrl)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title="Open in your default email client"
              >
                <Mail className="w-4 h-4 text-teal-400" />
                <span>Open in Gmail / Email App</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTicketForEmail(null);
                    setEmailNotificationData(null);
                    setPendingStatusChange(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmEmailAndStatus}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-lg shadow-teal-600/20 transition-all flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Update Task Bar & Log Dispatch</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
