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
  Users
} from 'lucide-react';
import Badge from '../common/Badge';
import Modal from '../common/Modal';

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
    currentAdmin 
  } = useApp();

  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);

  // New Admin Form State
  const [newAdmin, setNewAdmin] = useState({
    name: '',
    email: '',
    title: '',
    roleId: roles[0]?.id || 'specialist_doctor_verifier',
  });

  // New Role Form State
  const [newRole, setNewRole] = useState({
    name: '',
    badge: '',
    color: 'indigo',
    description: '',
    permissions: ['monitoring.view'],
  });

  // Handle Admin submit
  const handleAddAdminSubmit = (e) => {
    e.preventDefault();
    if (!newAdmin.name || !newAdmin.email) return;
    addAdmin(newAdmin);
    setIsAdminModalOpen(false);
    setNewAdmin({
      name: '',
      email: '',
      title: '',
      roleId: roles[0]?.id || 'specialist_doctor_verifier',
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

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel rounded-2xl p-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">Superadmin Governance</span>
            <Badge color="rose">Full Authority</Badge>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-indigo-400" />
            <span>Role-Based Access Control (RBAC) & Admin Accounts</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Provision platform administrators, define custom dynamic operational roles, and enforce granular clinical privilege safeguards.
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
              Roles define what capabilities an admin has across credentialing, hiring, marketing, and telemetry.
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
                  <span className="text-indigo-400 font-medium">Role ID: {role.id.substring(0, 15)}...</span>
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
        subtitle="Provision privileged access with an assigned RBAC role"
      >
        <form onSubmit={handleAddAdminSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Full Legal / Professional Name</label>
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
            <label className="block text-xs font-semibold text-slate-300 mb-1">Work Email Address</label>
            <input
              type="email"
              required
              placeholder="e.g. maya.patel@mindbridge.health"
              value={newAdmin.email}
              onChange={e => setNewAdmin({ ...newAdmin, email: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Operational Title / Clinical Department</label>
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
            <label className="block text-xs font-semibold text-slate-300 mb-1">Assign RBAC Role</label>
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

          <div className="pt-4 flex justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsAdminModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all"
            >
              Create Administrator
            </button>
          </div>
        </form>
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
                placeholder="e.g. Influencer Growth Lead"
                value={newRole.name}
                onChange={e => setNewRole({ ...newRole, name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Badge Tag</label>
              <input
                type="text"
                placeholder="e.g. Growth Lead"
                value={newRole.badge}
                onChange={e => setNewRole({ ...newRole, badge: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Color Theme</label>
            <div className="flex gap-2">
              {['indigo', 'emerald', 'purple', 'rose', 'amber', 'sky', 'teal'].map(c => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setNewRole({ ...newRole, color: c })}
                  className={`w-7 h-7 rounded-lg border-2 capitalize text-[10px] ${
                    newRole.color === c ? 'border-white ring-2 ring-purple-500' : 'border-transparent'
                  } bg-${c === 'indigo' ? 'indigo-500' : c === 'emerald' ? 'emerald-500' : c === 'purple' ? 'purple-500' : c === 'rose' ? 'rose-500' : c === 'amber' ? 'amber-500' : c === 'sky' ? 'sky-500' : 'teal-500'}`}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Role Mandate & Scope</label>
            <textarea
              rows={2}
              placeholder="Describe the clinical or business purpose of this position..."
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
