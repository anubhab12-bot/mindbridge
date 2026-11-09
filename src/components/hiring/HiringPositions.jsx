import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Briefcase, 
  Plus, 
  Users, 
  Award, 
  CheckCircle2, 
  Clock, 
  FileCheck, 
  UserCheck, 
  Star,
  Send,
  Building,
  DollarSign
} from 'lucide-react';
import Badge from '../common/Badge';
import Modal from '../common/Modal';

export default function HiringPositions() {
  const { 
    hiringPositions, 
    addHiringPosition, 
    candidates, 
    updateCandidateStage, 
    hireCandidate, 
    roles, 
    isSuperAdmin 
  } = useApp();

  const [isPositionModalOpen, setIsPositionModalOpen] = useState(false);
  const [selectedPositionFilter, setSelectedPositionFilter] = useState('all');

  // New Position Form state
  const [newPos, setNewPos] = useState({
    title: '',
    department: 'Medical Credentialing',
    roleId: roles[0]?.id || 'specialist_doctor_verifier',
    type: 'Full-Time',
    compensation: '$85 - $110/hr',
    openings: 2,
    description: '',
    requirements: ['MD in Psychiatry or PsyD', 'Valid State Medical Council License'],
    reqInput: '',
  });

  const handleCreatePosition = (e) => {
    e.preventDefault();
    if (!newPos.title) return;
    addHiringPosition({
      title: newPos.title,
      department: newPos.department,
      roleId: newPos.roleId,
      type: newPos.type,
      compensation: newPos.compensation,
      openings: parseInt(newPos.openings) || 1,
      description: newPos.description,
      requirements: newPos.requirements,
    });
    setIsPositionModalOpen(false);
    setNewPos({
      title: '',
      department: 'Medical Credentialing',
      roleId: roles[0]?.id || 'specialist_doctor_verifier',
      type: 'Full-Time',
      compensation: '$85 - $110/hr',
      openings: 2,
      description: '',
      requirements: ['MD in Psychiatry or PsyD', 'Valid State Medical Council License'],
      reqInput: '',
    });
  };

  const addRequirement = () => {
    if (newPos.reqInput.trim()) {
      setNewPos(prev => ({
        ...prev,
        requirements: [...prev.requirements, prev.reqInput.trim()],
        reqInput: '',
      }));
    }
  };

  const filteredCandidates = selectedPositionFilter === 'all'
    ? candidates
    : candidates.filter(c => c.positionId === selectedPositionFilter);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel rounded-2xl p-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Talent Acquisition & Staffing</span>
            <Badge color="emerald">Superadmin Portal</Badge>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-emerald-400" />
            <span>Dynamic Hiring & Role Requisitions</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Post open operational positions—such as Specialist Doctors to verify incoming practitioner registrations, or Influencer Ambassadors to promote the app. Review applicant pipelines and auto-provision administrative access upon hire.
          </p>
        </div>

        {isSuperAdmin && (
          <button
            onClick={() => setIsPositionModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/25 transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Post New Hiring Role</span>
          </button>
        )}
      </div>

      {/* Active Positions Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
            Active Job Requisitions ({hiringPositions.length})
          </h2>
          <span className="text-xs text-slate-400">Click a role to filter candidate pipeline</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {hiringPositions.map(pos => {
            const linkedRole = roles.find(r => r.id === pos.roleId) || { name: pos.roleId, color: 'indigo' };
            const isSelected = selectedPositionFilter === pos.id;
            const applicantTotal = candidates.filter(c => c.positionId === pos.id).length;

            return (
              <div
                key={pos.id}
                onClick={() => setSelectedPositionFilter(isSelected ? 'all' : pos.id)}
                className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                  isSelected 
                    ? 'bg-emerald-950/20 border-emerald-500 ring-1 ring-emerald-500' 
                    : 'glass-card hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5" />
                    {pos.department}
                  </span>
                  <Badge color={linkedRole.color} className="text-[10px]">
                    Role: {linkedRole.name}
                  </Badge>
                </div>

                <h3 className="text-sm font-bold text-white mb-1 leading-snug">
                  {pos.title}
                </h3>

                <p className="text-xs text-slate-400 line-clamp-2 mb-3">
                  {pos.description}
                </p>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-semibold">{pos.compensation}</span>
                  <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                    <Users className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{applicantTotal} Applicants</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Candidate Applications Board */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-400" />
              <span>Applicant Review & Admin Provisioning Pipeline</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Review credentialed doctor verifiers, influencer ambassadors, and safety specialists.
            </p>
          </div>

          {selectedPositionFilter !== 'all' && (
            <button
              onClick={() => setSelectedPositionFilter('all')}
              className="text-xs text-indigo-400 hover:text-indigo-300 underline font-medium self-start"
            >
              Clear filter (Showing {filteredCandidates.length})
            </button>
          )}
        </div>

        <div className="space-y-3">
          {filteredCandidates.map(cand => {
            const pos = hiringPositions.find(p => p.id === cand.positionId);
            const isHired = cand.stage === 'hired';

            return (
              <div 
                key={cand.id}
                className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                {/* Candidate details */}
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold flex-shrink-0">
                    {cand.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-white">{cand.name}</span>
                      <Badge 
                        color={isHired ? 'emerald' : cand.stage === 'offer' ? 'purple' : cand.stage === 'interview' ? 'sky' : 'slate'}
                        className="text-[10px]"
                      >
                        Stage: {cand.stage.toUpperCase()}
                      </Badge>
                      <span className="text-[10px] text-amber-400 font-semibold flex items-center gap-0.5">
                        <Star className="w-3 h-3 fill-amber-400" /> {cand.score}/100 Match
                      </span>
                    </div>

                    <p className="text-xs text-indigo-300 font-medium mt-0.5">
                      Applied for: {pos?.title || 'General Position'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {cand.specialty || cand.handle || cand.experience}
                    </p>
                    {cand.councilNumber && (
                      <p className="text-[11px] text-emerald-400 font-mono mt-0.5">
                        License / Council ID: {cand.councilNumber}
                      </p>
                    )}
                    <p className="text-[11px] text-slate-400 italic mt-1 bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                      "{cand.notes}"
                    </p>
                  </div>
                </div>

                {/* Pipeline Controls */}
                <div className="flex flex-wrap items-center gap-2 self-end lg:self-center">
                  {!isHired ? (
                    <>
                      <select
                        value={cand.stage}
                        onChange={e => updateCandidateStage(cand.id, e.target.value)}
                        className="bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="review">Under Review</option>
                        <option value="interview">Interview Scheduled</option>
                        <option value="offer">Offer Extended</option>
                      </select>

                      {isSuperAdmin && (
                        <button
                          onClick={() => {
                            if (confirm(`Officially hire ${cand.name} and auto-provision an Admin account with role: ${pos?.roleId}?`)) {
                              hireCandidate(cand.id);
                            }
                          }}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Hire & Provision Admin</span>
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Hired & Admin Active</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal: Post New Position */}
      <Modal
        isOpen={isPositionModalOpen}
        onClose={() => setIsPositionModalOpen(false)}
        title="Post New Hiring Role Requisition"
        subtitle="Open specialized positions for doctor verifiers, influencers, and triage leads"
      >
        <form onSubmit={handleCreatePosition} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Job Role Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Specialist Doctor - Registration Verification Board"
              value={newPos.title}
              onChange={e => setNewPos({ ...newPos, title: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Department</label>
              <select
                value={newPos.department}
                onChange={e => setNewPos({ ...newPos, department: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="Medical Credentialing">Medical Credentialing & Verification</option>
                <option value="Growth & Partnerships">Growth, Marketing & Influencer</option>
                <option value="Clinical Safety">Clinical Safety & Crisis SOS</option>
                <option value="Platform Engineering">Platform Engineering & AI</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Link to RBAC Role (Auto-Assigned on Hire)</label>
              <select
                value={newPos.roleId}
                onChange={e => setNewPos({ ...newPos, roleId: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                {roles.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.badge || r.id})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Compensation / Bounty</label>
              <input
                type="text"
                placeholder="e.g. $95/hr or 18% commission"
                value={newPos.compensation}
                onChange={e => setNewPos({ ...newPos, compensation: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Target Openings</label>
              <input
                type="number"
                min="1"
                max="20"
                value={newPos.openings}
                onChange={e => setNewPos({ ...newPos, openings: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Responsibilities & Mandate</label>
            <textarea
              rows={2}
              placeholder="Detail what this specialist or influencer will be responsible for..."
              value={newPos.description}
              onChange={e => setNewPos({ ...newPos, description: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Requirements</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="Add requirement (e.g. Valid Medical License)"
                value={newPos.reqInput}
                onChange={e => setNewPos({ ...newPos, reqInput: e.target.value })}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addRequirement(); } }}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={addRequirement}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 rounded-xl"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {newPos.requirements.map((req, idx) => (
                <span key={idx} className="text-[11px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-lg flex items-center gap-1">
                  <span>{req}</span>
                  <button
                    type="button"
                    onClick={() => setNewPos(prev => ({ ...prev, requirements: prev.requirements.filter((_, i) => i !== idx) }))}
                    className="text-slate-500 hover:text-rose-400"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsPositionModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition-all"
            >
              Post Hiring Position
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
