import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  ShieldCheck, 
  UserPlus, 
  Plus, 
  Trash2, 
  Key, 
  Check, 
  X, 
  AlertCircle, 
  Lock,
  Layers,
  Sparkles,
  Users,
  Mail,
  Send,
  Copy,
  ExternalLink,
  Wand2,
  MessageSquare,
  Share2,
  Globe,
  CheckCircle2,
  RefreshCw,
  FileSignature,
  FileCheck,
  FileText
} from 'lucide-react';
import Badge from '../common/Badge';
import Modal from '../common/Modal';
import { emailService, SUPER_CREATOR_EMAIL, SUPER_CREATOR_NAME } from '../../services/emailService';
import { apiService } from '../../services/apiService';

export default function RBACManagement() {
  const { 
    roles, 
    admins, 
    addAdmin, 
    deleteAdmin, 
    createRole, 
    deleteRole, 
    AVAILABLE_PERMISSIONS, 
    isSuperAdmin,
    currentAdmin,
    acceptAdminOffer,
    declineAdminOffer,
    pendingConsentAdmin,
    setPendingConsentAdmin
  } = useApp();

  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [sentInvitationInfo, setSentInvitationInfo] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiTone, setAiTone] = useState('executive');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [directChannel, setDirectChannel] = useState('both'); // 'email', 'whatsapp', 'both'
  const [reviewingConsentAdmin, setReviewingConsentAdmin] = useState(null);
  const [consentAgreed, setConsentAgreed] = useState(false);
  const [consentSignature, setConsentSignature] = useState('');

  // New Admin Form State
  const [newAdmin, setNewAdmin] = useState({
    name: '',
    email: '',
    title: '',
    roleId: roles[0]?.id || 'specialist_doctor_verifier',
    sendEmail: true,
    customNote: '',
  });

  // New Role Form State
  const [newRole, setNewRole] = useState({
    name: '',
    badge: '',
    color: 'indigo',
    description: '',
    permissions: ['monitoring.view'],
  });

  // AI Welcome Message Draft Generator
  const handleAiGenerate = (selectedTone) => {
    const toneToUse = selectedTone || aiTone;
    setAiTone(toneToUse);
    setIsAiGenerating(true);
    setTimeout(() => {
      const assignedRole = roles.find(r => r.id === newAdmin.roleId) || { name: newAdmin.roleId };
      const generated = emailService.generateAiWelcomeMessage({
        name: newAdmin.name,
        roleId: newAdmin.roleId,
        roleName: assignedRole.name || 'Administrator',
        title: newAdmin.title,
        tone: toneToUse,
      });
      setNewAdmin(prev => ({ ...prev, customNote: generated }));
      setIsAiGenerating(false);
    }, 280);
  };

  // Handle Admin submit & send invitation email / direct message
  const handleAddAdminSubmit = async (e) => {
    e.preventDefault();
    if (!newAdmin.name || !newAdmin.email) return;

    setIsSubmitting(true);
    const assignedRole = roles.find(r => r.id === newAdmin.roleId) || { name: newAdmin.roleId, permissions: [] };
    
    // 1. Add admin locally & in state
    addAdmin({
      name: newAdmin.name,
      email: newAdmin.email,
      title: newAdmin.title || 'Platform Administrator',
      roleId: newAdmin.roleId,
    });

    // 2. Generate invitation links and payload
    const invitationPayload = emailService.generateAdminInvitation({
      toEmail: newAdmin.email,
      recipientName: newAdmin.name,
      roleName: assignedRole.name,
      title: newAdmin.title,
      permissions: assignedRole.permissions || [],
      customNote: newAdmin.customNote,
    });

    // 3. Dispatch direct message via Live In-App Gateway & MongoDB Audit
    try {
      const receipt = await apiService.sendDirectAdminMessage({
        toEmail: newAdmin.email,
        recipientName: newAdmin.name,
        roleName: assignedRole.name,
        title: newAdmin.title,
        customNote: newAdmin.customNote,
        permissions: assignedRole.permissions || [],
        channel: directChannel,
      });
      invitationPayload.receipt = receipt;
    } catch (err) {
      console.warn('Direct message dispatch notice:', err);
    }

    setIsSubmitting(false);
    setIsAdminModalOpen(false);
    setSentInvitationInfo(invitationPayload);

    // Reset form
    setNewAdmin({
      name: '',
      email: '',
      title: '',
      roleId: roles[0]?.id || 'specialist_doctor_verifier',
      sendEmail: true,
      customNote: '',
    });
  };

  // Handle Role submit
  const handleAddRoleSubmit = (e) => {
    e.preventDefault();
    if (!newRole.name) return;
    createRole(newRole);
    setIsRoleModalOpen(false);
    setNewRole({
      name: '',
      badge: '',
      color: 'indigo',
      description: '',
      permissions: ['monitoring.view'],
    });
  };

  const togglePermissionForNewRole = (permId) => {
    setNewRole(prev => {
      const exists = prev.permissions.includes(permId);
      return {
        ...prev,
        permissions: exists 
          ? prev.permissions.filter(p => p !== permId)
          : [...prev.permissions, permId]
      };
    });
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel rounded-2xl p-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">Superadmin Governance</span>
            <Badge color="rose">Super Creator Authority</Badge>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-indigo-400" />
            <span>Role-Based Access Control (RBAC) & Admin Accounts</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Provision platform administrators, assign roles (Superadmin, Specialist Doctors, Testers), and automatically dispatch permission onboarding emails from <strong>{SUPER_CREATOR_EMAIL}</strong>.
          </p>
        </div>

        {/* Action Buttons (Superadmin only) */}
        {isSuperAdmin ? (
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsRoleModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/25 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create Dynamic Role</span>
            </button>
            <button
              onClick={() => setIsAdminModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Administrator</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
            <Lock className="w-4 h-4" />
            <span>Read-Only View (Requires Superadmin clearance)</span>
          </div>
        )}
      </div>

      {/* Admin Accounts Table */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-400" />
              <span>Registered Administrative Accounts</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Active administrators with privileged platform access ({admins.length} total)
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Admin Name</th>
                <th className="py-3 px-4">Assigned Role</th>
                <th className="py-3 px-4">Department / Title</th>
                <th className="py-3 px-4">Security Status</th>
                <th className="py-3 px-4">Last Activity</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {admins.map(admin => {
                const roleObj = roles.find(r => r.id === admin.roleId) || { name: admin.roleId, color: 'slate', badge: 'Custom' };
                const isSelf = admin.id === currentAdmin.id;

                return (
                  <tr key={admin.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <img 
                          src={admin.avatar} 
                          alt={admin.name} 
                          className="w-9 h-9 rounded-lg object-cover border border-slate-700" 
                        />
                        <div>
                          <p className="font-bold text-white flex items-center gap-1.5">
                            <span>{admin.name}</span>
                            {isSelf && (
                              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.2 rounded font-mono">
                                (You)
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-slate-400">{admin.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <Badge color={roleObj.color}>
                        {roleObj.name}
                      </Badge>
                    </td>

                    <td className="py-3.5 px-4 text-slate-300 font-medium">
                      {admin.title}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Active
                        </span>
                        {admin.twoFactor ? (
                          <span className="text-[10px] text-slate-400 flex items-center gap-1" title="2FA Enabled">
                            <Key className="w-3 h-3 text-emerald-400" /> 2FA
                          </span>
                        ) : (
                          <span className="text-[10px] text-amber-400 flex items-center gap-1" title="2FA Pending">
                            No 2FA
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-400">
                      {admin.lastActive}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {isSuperAdmin && !isSelf && (
                        <button
                          onClick={() => {
                            if (confirm(`Revoke admin privileges for ${admin.name}?`)) {
                              deleteAdmin(admin.id);
                            }
                          }}
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                          title="Revoke Admin Access"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dynamic Roles Matrix */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-purple-400" />
              <span>Configured System & Custom Roles</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Roles define what capabilities an admin has across credentialing, QA bug tracking, hiring, marketing, and telemetry.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map(role => {
            const adminCount = admins.filter(a => a.roleId === role.id).length;

            return (
              <div 
                key={role.id}
                className="rounded-xl bg-slate-900/60 border border-slate-800 p-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <Badge color={role.color} className="font-bold">
                      {role.name}
                    </Badge>
                    <div className="flex items-center gap-1">
                      {role.isSystem ? (
                        <span className="text-[10px] text-slate-400 font-mono">System</span>
                      ) : (
                        <span className="text-[10px] text-purple-400 font-mono">Dynamic</span>
                      )}
                      {!role.isSystem && isSuperAdmin && (
                        <button
                          onClick={() => {
                            if (confirm(`Delete dynamic role "${role.name}"?`)) {
                              deleteRole(role.id);
                            }
                          }}
                          className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors ml-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed min-h-[36px]">
                    {role.description}
                  </p>

                  {/* Permissions count & preview */}
                  <div className="mt-3 pt-3 border-t border-slate-800/80">
                    <span className="text-[11px] font-semibold text-slate-300">
                      Permissions ({role.permissions.length}):
                    </span>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {role.permissions.slice(0, 4).map(p => (
                        <span key={p} className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono">
                          {p}
                        </span>
                      ))}
                      {role.permissions.length > 4 && (
                        <span className="text-[10px] bg-slate-800/60 text-slate-400 px-1.5 py-0.5 rounded">
                          +{role.permissions.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <span>{adminCount} assigned admin{adminCount !== 1 ? 's' : ''}</span>
                  <span className="text-indigo-400 font-medium font-mono text-[10px]">{role.id}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal: Add New Admin */}
      <Modal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        title="Add New MindBridge Administrator"
        subtitle="Provision privileged access, craft customized AI welcome message & dispatch directly from app"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleAddAdminSubmit} className="space-y-4">
          {/* Super Creator Dispatch Notice */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-indigo-950/50 via-slate-900 to-indigo-950/30 border border-indigo-500/30 flex items-start gap-3">
            <Mail className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-white">Direct Message & Email Dispatch from App</p>
                <Badge color="emerald">Super Creator: {SUPER_CREATOR_EMAIL}</Badge>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Direct credentials and invitation will be prepared from <strong>{SUPER_CREATOR_NAME} ({SUPER_CREATOR_EMAIL})</strong> notifying the recipient of their role, access portal URL, security protocols, and assigned permissions.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Dr. Maya Patel, MD"
                value={newAdmin.name}
                onChange={e => setNewAdmin({ ...newAdmin, name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Recipient Email Address *</label>
              <input
                type="email"
                required
                placeholder="e.g. maya.patel@mindbridge.health"
                value={newAdmin.email}
                onChange={e => setNewAdmin({ ...newAdmin, email: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Operational Title / Department *</label>
              <input
                type="text"
                required
                placeholder="e.g. Clinical Verification Specialist"
                value={newAdmin.title}
                onChange={e => setNewAdmin({ ...newAdmin, title: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Assign RBAC Role *</label>
              <select
                value={newAdmin.roleId}
                onChange={e => setNewAdmin({ ...newAdmin, roleId: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                {roles.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.badge || r.id})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ✨ MindBridge AI Message Writer Suite */}
          <div className="p-3.5 rounded-xl bg-gradient-to-br from-purple-950/40 via-indigo-950/30 to-slate-950 border border-purple-500/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
                <span className="text-xs font-bold text-white tracking-wide">MindBridge AI Message Writer</span>
                <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.5 rounded font-mono">
                  Smart Onboarding Assistant
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleAiGenerate(aiTone)}
                disabled={isAiGenerating}
                className="text-[11px] font-semibold text-purple-200 hover:text-white flex items-center gap-1.5 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 px-3 py-1 rounded-lg transition-all"
                title="Automatically generate tailored welcome message based on name and role"
              >
                <Wand2 className={`w-3.5 h-3.5 ${isAiGenerating ? 'animate-spin' : ''}`} />
                <span>{isAiGenerating ? 'AI Writing...' : '✨ Auto-Draft with AI'}</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed">
              Click a persona tone below to auto-craft personalized onboarding instructions from Super Creator <strong>Anubhab Nandi</strong>:
            </p>

            {/* AI Tone Presets */}
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {[
                { id: 'executive', label: '👔 Executive Governance' },
                { id: 'clinical', label: '🩺 Clinical Lead' },
                { id: 'qa', label: '🐞 QA / Bug Hunter' },
                { id: 'warm', label: '🤝 Warm & Direct' },
                { id: 'urgent', label: '⚡ Urgent Clearance' },
                { id: 'influencer', label: '📣 Growth Ambassador' },
              ].map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleAiGenerate(t.id)}
                  className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg border transition-all ${
                    aiTone === t.id
                      ? 'bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-600/30'
                      : 'bg-slate-900/90 text-slate-300 border-slate-700/80 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-300">
                Personal Welcome Message from Anubhab Nandi (Optional)
              </label>
              {newAdmin.customNote && (
                <button
                  type="button"
                  onClick={() => setNewAdmin(prev => ({ ...prev, customNote: '' }))}
                  className="text-[10px] text-slate-400 hover:text-rose-400 transition-colors"
                >
                  Clear Message
                </button>
              )}
            </div>
            <textarea
              rows={3}
              placeholder="Use AI Writer above or add personal guidance, team objectives, or access instructions..."
              value={newAdmin.customNote}
              onChange={e => setNewAdmin({ ...newAdmin, customNote: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 leading-relaxed font-sans"
            />
          </div>

          {/* Direct Dispatch Mode */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/90 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Send className="w-4 h-4 text-emerald-400" />
              <div className="text-xs">
                <span className="font-semibold text-white">Direct In-App Delivery Mode:</span>
                <span className="text-slate-400 ml-1.5 text-[11px]">Audit in MongoDB + 1-Click Web Dispatch</span>
              </div>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              Live Gateway Active
            </span>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsAdminModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Dispatching Direct Message...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Direct Message & Provision Admin</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Invitation Email Dispatched & Direct Messaging Options */}
      <Modal
        isOpen={!!sentInvitationInfo}
        onClose={() => setSentInvitationInfo(null)}
        title="Admin Invitation & Direct Message Dispatched"
        subtitle={`Sent on behalf of Super Creator ${SUPER_CREATOR_EMAIL}`}
        maxWidth="max-w-2xl"
      >
        {sentInvitationInfo && (
          <div className="space-y-4">
            {/* Live Gateway Delivery Receipt */}
            <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-300 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Direct Message Dispatched & Admin Privileges Granted</span>
                </div>
                <span className="font-mono text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded">
                  {sentInvitationInfo.receipt?.trackingId || 'MSG-DIR-GATEWAY'}
                </span>
              </div>
              <p className="text-emerald-200/90 text-[11px] leading-relaxed">
                Administrative credentials and onboarding instructions have been recorded in the MindBridge live database and prepared for direct multi-channel delivery from <strong>{SUPER_CREATOR_EMAIL}</strong>.
              </p>
            </div>

            {/* Recipient Overview */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Recipient Email:</span>
                <span className="text-white font-mono font-medium">{sentInvitationInfo.to}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">From Super Creator:</span>
                <span className="text-emerald-400 font-bold">{SUPER_CREATOR_EMAIL}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Email Subject:</span>
                <span className="text-slate-200 font-medium">{sentInvitationInfo.subject}</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[11px]">
                <span className="text-slate-400">Delivery Gateway:</span>
                <span className="text-indigo-400 font-mono">
                  {sentInvitationInfo.receipt?.gateway || 'MindBridge Live Gateway (Audited)'}
                </span>
              </div>
            </div>

            {/* Direct 1-Click Multi-Channel Dispatch Bar */}
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-indigo-950/60 to-purple-950/50 border border-indigo-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Direct 1-Click Channels (No Desktop App Required):</span>
                </span>
                <span className="text-[10px] text-slate-400">Direct from Browser</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {/* 1-Click Web Gmail Direct Compose */}
                <a
                  href={sentInvitationInfo.webGmailUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2.5 rounded-xl bg-rose-600/90 hover:bg-rose-500 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20 transition-all"
                >
                  <Mail className="w-4 h-4" />
                  <span>Open in Web Gmail (1-Click)</span>
                  <ExternalLink className="w-3 h-3 opacity-70" />
                </a>

                {/* 1-Click Direct WhatsApp Message */}
                <a
                  href={sentInvitationInfo.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2.5 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Send via WhatsApp Direct</span>
                  <ExternalLink className="w-3 h-3 opacity-70" />
                </a>
              </div>
            </div>

            {/* Generated Email Content */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-slate-300">Full Invitation Message Content:</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(sentInvitationInfo.body, 'invite-body')}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-lg transition-all"
                >
                  {copiedId === 'invite-body' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Full Message</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300 font-mono whitespace-pre-wrap max-h-52 overflow-y-auto leading-relaxed">
                {sentInvitationInfo.body}
              </pre>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <a
                href={sentInvitationInfo.mailtoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors"
                title="Launch local desktop email client"
              >
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>Default Email Client</span>
              </a>

              <button
                type="button"
                onClick={() => setSentInvitationInfo(null)}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </Modal>


      {/* Modal: Administrative Appointment Consent Agreement */}
      <Modal
        isOpen={!!reviewingConsentAdmin || !!pendingConsentAdmin}
        onClose={() => {
          setReviewingConsentAdmin(null);
          if (setPendingConsentAdmin) setPendingConsentAdmin(null);
        }}
        title="Administrative Appointment & Consent Agreement"
        subtitle="Mandatory Governance & Ethics Acceptance Protocol"
        maxWidth="max-w-2xl"
      >
        {(() => {
          const activeOffer = reviewingConsentAdmin || pendingConsentAdmin;
          if (!activeOffer) return null;
          const assignedRole = roles.find(r => r.id === activeOffer.roleId) || { name: activeOffer.roleId, permissions: [] };

          return (
            <div className="space-y-4">
              {/* Creator Appointment Banner */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-950/60 via-purple-950/40 to-slate-900 border border-indigo-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileSignature className="w-5 h-5 text-indigo-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Official Creator Appointment</span>
                  </div>
                  <Badge color="rose">Granted by Anubhab Nandi</Badge>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Super Creator <strong>{SUPER_CREATOR_NAME} ({SUPER_CREATOR_EMAIL})</strong> has provisioned administrative clearance for <strong>{activeOffer.name}</strong> on the MindBridge Healthcare Platform. To activate your access, please review and accept this charter.
                </p>
              </div>

              {/* Offer Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Appointed Candidate:</span>
                  <span className="text-white font-semibold">{activeOffer.name}</span>
                  <span className="text-slate-400 block text-[11px] font-mono">{activeOffer.email}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Assigned Role:</span>
                  <span className="text-indigo-400 font-bold">{assignedRole.name}</span>
                  <span className="text-slate-400 block text-[11px]">{activeOffer.title || 'Platform Administration'}</span>
                </div>
              </div>

              {/* Proposed Permissions List */}
              <div>
                <span className="text-xs font-semibold text-slate-300 block mb-1.5">Authorized Administrative Permissions:</span>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 rounded-xl bg-slate-950 border border-slate-800/80">
                  {(assignedRole.permissions || []).map(p => (
                    <span key={p} className="text-[10px] bg-slate-800 text-indigo-300 px-2 py-0.5 rounded border border-slate-700/60 font-mono">
                      • {p}
                    </span>
                  ))}
                  {(!assignedRole.permissions || assignedRole.permissions.length === 0) && (
                    <span className="text-[11px] text-slate-400">General Administrative Access</span>
                  )}
                </div>
              </div>

              {/* Clinical Ethics & Data Privacy Undertaking */}
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2 text-xs">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Clinical Confidentiality & Platform Governance Pledge:</span>
                </span>
                <ul className="text-slate-300 text-[11px] space-y-1.5 list-disc pl-4 leading-relaxed">
                  <li><strong>Patient Privacy (Tele-MANAS & AES-256):</strong> I will never disclose patient medical records, session journals, or mental health telemetry to unauthorized third parties.</li>
                  <li><strong>Integrity in Operations:</strong> I agree to use doctor verification, QA bug reporting, and feature controls solely for authorized healthcare purposes.</li>
                  <li><strong>Super Creator Oversight:</strong> I acknowledge that Super Creator Anubhab Nandi maintains audit logging and may adjust or revoke privileges if protocols are breached.</li>
                </ul>
              </div>

              {/* Consent Signature & Acceptance Checkbox */}
              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Electronic Signature (Full Legal Name) *</label>
                  <input
                    type="text"
                    value={consentSignature}
                    onChange={e => setConsentSignature(e.target.value)}
                    placeholder="Type your full name to sign"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={consentAgreed}
                    onChange={e => setConsentAgreed(e.target.checked)}
                    className="mt-0.5 rounded border-slate-700 text-indigo-600 focus:ring-0 bg-slate-950"
                  />
                  <span className="text-xs text-slate-300 leading-relaxed">
                    I have read, understood, and solemnly accept this administrative appointment. I consent to all responsibilities and agree to uphold MindBridge patient safety standards.
                  </span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    declineAdminOffer(activeOffer.id, 'Declined by recipient');
                    setReviewingConsentAdmin(null);
                    if (setPendingConsentAdmin) setPendingConsentAdmin(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors"
                >
                  Decline Appointment Offer
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setReviewingConsentAdmin(null);
                      if (setPendingConsentAdmin) setPendingConsentAdmin(null);
                    }}
                    className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:bg-slate-800 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    disabled={!consentAgreed || !consentSignature.trim()}
                    onClick={() => {
                      acceptAdminOffer(activeOffer.id, { signature: consentSignature });
                      setReviewingConsentAdmin(null);
                      if (setPendingConsentAdmin) setPendingConsentAdmin(null);
                    }}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold shadow-lg shadow-emerald-600/25 flex items-center gap-1.5 transition-all"
                  >
                    <Check className="w-4 h-4" />
                    <span>Accept & Activate Admin Privileges</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Modal: Create Dynamic Custom Role */}
      <Modal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        title="Create Dynamic Operational Role"
        subtitle="Superadmin tool to tailor bespoke positions and permissions"
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleAddRoleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Role Title / Designation</label>
              <input
                type="text"
                required
                placeholder="e.g. Lead QA Engineer"
                value={newRole.name}
                onChange={e => setNewRole({ ...newRole, name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Badge Tag</label>
              <input
                type="text"
                placeholder="e.g. QA Tester"
                value={newRole.badge}
                onChange={e => setNewRole({ ...newRole, badge: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Role Mandate & Scope</label>
            <textarea
              rows={2}
              placeholder="Describe the clinical, quality assurance, or business purpose of this position..."
              value={newRole.description}
              onChange={e => setNewRole({ ...newRole, description: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Select Granular Permissions ({newRole.permissions.length} selected):
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-2 bg-slate-950/70 border border-slate-800 rounded-xl">
              {AVAILABLE_PERMISSIONS.map(p => {
                const isSelected = newRole.permissions.includes(p.id);
                return (
                  <div
                    key={p.id}
                    onClick={() => togglePermissionForNewRole(p.id)}
                    className={`p-2 rounded-lg cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-purple-600/20 border-purple-500/50 text-white'
                        : 'bg-slate-900/40 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">{p.label}</span>
                      <span className={`w-4 h-4 rounded flex items-center justify-center text-[10px] ${
                        isSelected ? 'bg-purple-600 text-white' : 'border border-slate-700'
                      }`}>
                        {isSelected && <Check className="w-3 h-3" />}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{p.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsRoleModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/20 transition-all"
            >
              Create Role
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
