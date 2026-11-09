import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  UserCheck, 
  Stethoscope, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  FileText, 
  Search, 
  Filter, 
  Building2, 
  GraduationCap, 
  Award, 
  ShieldCheck, 
  Clock,
  Eye,
  Check,
  X
} from 'lucide-react';
import Badge from '../common/Badge';
import Modal from '../common/Modal';

export default function DoctorVerification() {
  const { 
    doctorApplications, 
    verifyDoctor, 
    hasPermission, 
    currentAdmin, 
    currentRole 
  } = useApp();

  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [reviewNote, setReviewNote] = useState('');
  const [activeModalAction, setActiveModalAction] = useState(null); // 'approve', 'reject', 'request_docs'

  const canVerify = hasPermission('doctors.verify');

  const filteredDoctors = doctorApplications.filter(doc => {
    const matchesStatus = filterStatus === 'all' || doc.status === filterStatus;
    const matchesSearch = 
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.specialty.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.regNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.hospital.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleActionConfirm = () => {
    if (!selectedDoc || !activeModalAction) return;
    
    if (activeModalAction === 'approve') {
      verifyDoctor(selectedDoc.id, 'verified', reviewNote || 'Verified credentials and valid council registration.');
    } else if (activeModalAction === 'reject') {
      verifyDoctor(selectedDoc.id, 'rejected', reviewNote || 'Rejected: Credentials do not meet clinical criteria.');
    } else if (activeModalAction === 'request_docs') {
      verifyDoctor(selectedDoc.id, 'needs_documents', reviewNote || 'Requested updated license proof.');
    }

    setActiveModalAction(null);
    setSelectedDoc(null);
    setReviewNote('');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel rounded-2xl p-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Clinical Board Verification</span>
            <Badge color="emerald">Specialist Doctor Suite</Badge>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Stethoscope className="w-6 h-6 text-emerald-400" />
            <span>Doctor Registrations & Medical Credential Review</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Specialist physicians validate state medical council registrations, peer certifications, and medical degrees to ensure patient safety before opening teleconsultations.
          </p>
        </div>

        {!canVerify && (
          <div className="px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>Read-Only mode. Switch to Specialist Doctor Verifier in top bar to approve.</span>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by doctor, license, hospital..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Status Pill Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All Applications' },
            { id: 'pending', label: 'Pending Review' },
            { id: 'verified', label: 'Verified & Active' },
            { id: 'needs_documents', label: 'Needs Docs' },
            { id: 'rejected', label: 'Rejected' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                filterStatus === tab.id
                  ? 'bg-emerald-600 text-white font-bold shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Doctor Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredDoctors.map(doc => {
          const isPending = doc.status === 'pending';
          const isVerified = doc.status === 'verified';
          const isNeedsDocs = doc.status === 'needs_documents';
          const isRejected = doc.status === 'rejected';

          return (
            <div 
              key={doc.id}
              className={`p-5 rounded-2xl border transition-all ${
                isPending 
                  ? 'bg-slate-900/80 border-slate-700/80 shadow-lg shadow-emerald-950/20' 
                  : 'glass-card'
              }`}
            >
              {/* Doctor header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <img 
                    src={doc.avatar} 
                    alt={doc.name} 
                    className="w-12 h-12 rounded-xl object-cover border border-slate-700 flex-shrink-0" 
                  />
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <span>{doc.name}</span>
                      {isVerified && <ShieldCheck className="w-4 h-4 text-emerald-400" title="Verified MindBridge Practitioner" />}
                    </h3>
                    <p className="text-xs text-indigo-300 font-medium">{doc.specialty}</p>
                    <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <Building2 className="w-3 h-3 text-slate-400" />
                      <span>{doc.hospital}</span>
                    </p>
                  </div>
                </div>

                <Badge 
                  color={isVerified ? 'emerald' : isRejected ? 'rose' : isNeedsDocs ? 'amber' : 'sky'}
                  className="capitalize font-bold text-[10px]"
                >
                  {doc.status.replace('_', ' ')}
                </Badge>
              </div>

              {/* Credential Specs */}
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Medical Council Reg #:</span>
                  <span className="font-mono text-emerald-400 font-bold">{doc.regNumber}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Council Authority:</span>
                  <span className="text-slate-200">{doc.medicalCouncil}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Experience & Fee:</span>
                  <span className="text-slate-200">{doc.experienceYears} Years • ${doc.consultationFee}/session</span>
                </div>

                {/* Degrees */}
                <div className="pt-2 border-t border-slate-800 flex items-start gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0 mt-0.5" />
                  <div className="flex flex-wrap gap-1">
                    {doc.degrees.map((deg, i) => (
                      <span key={i} className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded font-medium">
                        {deg}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Uploaded Documents List */}
              <div className="mt-3">
                <span className="text-[11px] font-semibold text-slate-400">Attached Verifiable Documents:</span>
                <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                  {doc.docs.map((file, idx) => (
                    <div 
                      key={idx}
                      className="p-1.5 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between text-[10px]"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <FileText className="w-3 h-3 text-indigo-400 flex-shrink-0" />
                        <span className="text-slate-300 truncate">{file.name}</span>
                      </div>
                      <span className="text-slate-400 text-[9px] flex-shrink-0">{file.size}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Verification Audit Note */}
              {doc.verifiedBy && (
                <div className="mt-3 p-2 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
                  <span className="text-slate-300 font-semibold">Specialist Review: </span>
                  <span>{doc.verificationNotes} ({doc.verifiedBy})</span>
                </div>
              )}

              {/* Verification Actions (Specialist Doctor Role) */}
              {canVerify && (
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-end gap-2">
                  <button
                    onClick={() => {
                      setSelectedDoc(doc);
                      setActiveModalAction('request_docs');
                      setReviewNote(doc.verificationNotes || '');
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-colors"
                  >
                    Request Re-upload
                  </button>
                  <button
                    onClick={() => {
                      setSelectedDoc(doc);
                      setActiveModalAction('reject');
                      setReviewNote(doc.verificationNotes || '');
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-semibold transition-colors"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => {
                      setSelectedDoc(doc);
                      setActiveModalAction('approve');
                      setReviewNote('Medical council verification verified authentic. Authorized for clinical telehealth.');
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Approve Doctor</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal: Verification Decision Drawer */}
      <Modal
        isOpen={!!activeModalAction}
        onClose={() => { setActiveModalAction(null); setSelectedDoc(null); }}
        title={
          activeModalAction === 'approve' 
            ? `Approve Doctor: ${selectedDoc?.name}` 
            : activeModalAction === 'reject' 
            ? `Reject Application: ${selectedDoc?.name}` 
            : `Request Documents: ${selectedDoc?.name}`
        }
        subtitle="Specialist Doctor Credentialing Audit"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-300">
            {activeModalAction === 'approve' && 'By approving, this doctor will immediately be granted access to treat patients on the live MindBridge application and receive appointment bookings.'}
            {activeModalAction === 'reject' && 'The doctor will be notified of this rejection and will not be permitted to practice on MindBridge.'}
            {activeModalAction === 'request_docs' && 'The doctor will receive an automated request to upload corrected or renewed medical licensing documents.'}
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Specialist Reviewer Clinical Notes (Recorded in Audit Log)
            </label>
            <textarea
              rows={3}
              value={reviewNote}
              onChange={e => setReviewNote(e.target.value)}
              placeholder="Enter clinical rationale, license check confirmation, or missing document specification..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
            <button
              onClick={() => { setActiveModalAction(null); setSelectedDoc(null); }}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              onClick={handleActionConfirm}
              className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-lg transition-all ${
                activeModalAction === 'approve' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/25' :
                activeModalAction === 'reject' ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/25' :
                'bg-amber-600 hover:bg-amber-500 shadow-amber-600/25'
              }`}
            >
              Confirm Clinical Decision
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
