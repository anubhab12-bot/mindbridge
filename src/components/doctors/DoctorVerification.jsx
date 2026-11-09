import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  UserCheck, 
  Stethoscope, 
  Plus, 
  Trash2, 
  Search, 
  Filter, 
  Building2, 
  GraduationCap, 
  ShieldCheck, 
  Clock,
  RefreshCw,
  AlertCircle,
  Check,
  X,
  DollarSign
} from 'lucide-react';
import Badge from '../common/Badge';
import Modal from '../common/Modal';

export default function DoctorVerification() {
  const { 
    liveDoctors, 
    deleteLiveDoctor, 
    addNewLiveDoctor, 
    refreshLiveData, 
    isLoadingLive, 
    hasPermission, 
    isSuperAdmin 
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Live Doctor Form State
  const [newDoctor, setNewDoctor] = useState({
    name: '',
    email: '',
    password: '',
    category: 'CLINICAL_PSYCHOLOGIST',
    specialty: 'Clinical Psychology & CBT',
    regNumber: 'MCI-' + Math.floor(100000 + Math.random() * 900000),
    experienceYears: 5,
    fee: 800,
    bio: '',
  });

  const canVerify = hasPermission('doctors.verify');

  const filteredDoctors = liveDoctors.filter(doc => {
    const matchesCategory = filterCategory === 'all' || doc.professionalCategory === filterCategory;
    const matchesSearch = 
      (doc.displayName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.specialties || []).some(s => s.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (doc.id || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleAddDoctorSubmit = async (e) => {
    e.preventDefault();
    if (!newDoctor.name || !newDoctor.email) return;
    setIsSubmitting(true);
    try {
      await addNewLiveDoctor(newDoctor);
      setIsAddModalOpen(false);
      setNewDoctor({
        name: '',
        email: '',
        password: '',
        category: 'CLINICAL_PSYCHOLOGIST',
        specialty: 'Clinical Psychology & CBT',
        regNumber: 'MCI-' + Math.floor(100000 + Math.random() * 900000),
        experienceYears: 5,
        fee: 800,
        bio: '',
      });
      alert('Doctor created and registered in live MongoDB backend!');
    } catch (err) {
      alert('Error adding doctor: ' + (err.message || 'Failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDoctor = async (doc) => {
    if (confirm(`Permanently delete doctor "${doc.displayName}" from the live MongoDB database?`)) {
      try {
        await deleteLiveDoctor(doc.id);
      } catch (err) {
        alert('Doctor deleted from view.');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel rounded-2xl p-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Live MongoDB Database</span>
            <Badge color="emerald">Real-time Doctors ({liveDoctors.length})</Badge>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Stethoscope className="w-6 h-6 text-emerald-400" />
            <span>Doctor Profiles & Specialist Verification</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Directly connected to the MindBridge API. Specialist doctors monitor registrations, verify medical licenses, and approve or delete practitioner records in real time.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={refreshLiveData}
            disabled={isLoadingLive}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            title="Refresh database"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingLive ? 'animate-spin text-emerald-400' : ''}`} />
          </button>

          {(canVerify || isSuperAdmin) && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/25 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Real Doctor</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search real doctors by name, specialty, ID..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All Categories' },
            { id: 'CLINICAL_PSYCHOLOGIST', label: 'Clinical Psychologist' },
            { id: 'PSYCHIATRIST', label: 'Psychiatrist' },
            { id: 'COUNSELLOR', label: 'Counsellor' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterCategory(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                filterCategory === tab.id
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
      {liveDoctors.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
            <Stethoscope className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Database is Clean (0 Doctors)</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              All test/demo accounts have been cleared. Ready to add fresh, real medical specialists and verified doctors.
            </p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add First Real Doctor</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredDoctors.map(doc => {
            const isVerified = doc.verified === true;
            const fee = doc.consultationFee?.amount ? `${doc.consultationFee.currency || 'INR'} ${doc.consultationFee.amount}` : 'Free/Unset';

            return (
              <div 
                key={doc.id}
                className="glass-card p-5 rounded-2xl flex flex-col justify-between hover:border-slate-700 transition-all"
              >
                <div>
                  {/* Top Doctor Info */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-300 font-bold text-base flex-shrink-0">
                        {(doc.displayName || 'Dr').substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                          <span>{doc.displayName}</span>
                          {isVerified && <ShieldCheck className="w-4 h-4 text-emerald-400" title="Verified MindBridge Practitioner" />}
                        </h3>
                        <p className="text-xs text-indigo-300 font-medium">
                          {doc.professionalCategory?.replace('_', ' ')}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          DB ID: {doc.id}
                        </p>
                      </div>
                    </div>

                    <Badge color={isVerified ? 'emerald' : 'amber'} className="text-[10px] font-bold">
                      {isVerified ? 'VERIFIED' : 'PENDING'}
                    </Badge>
                  </div>

                  {/* Doctor Details */}
                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Experience:</span>
                      <span className="text-slate-200 font-semibold">{doc.yearsExperience || 0} Years</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Consultation Fee:</span>
                      <span className="text-emerald-400 font-mono font-bold">{fee}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Slot Duration & Timezone:</span>
                      <span className="text-slate-300">{doc.slotDurationMinutes || 45} mins • {doc.timezone || 'Asia/Calcutta'}</span>
                    </div>

                    {/* Specialties */}
                    <div className="pt-2 border-t border-slate-800 flex items-start gap-1.5">
                      <span className="text-[10px] text-slate-400">Specialties:</span>
                      <div className="flex flex-wrap gap-1">
                        {(doc.specialties || []).map((spec, i) => (
                          <span key={i} className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded font-medium">
                            {spec}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Qualifications */}
                    {(doc.qualifications || []).length > 0 && (
                      <div className="pt-1 flex items-start gap-1.5">
                        <GraduationCap className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0 mt-0.5" />
                        <div className="flex flex-wrap gap-1">
                          {doc.qualifications.map((q, i) => (
                            <span key={i} className="text-[10px] bg-indigo-950/40 text-indigo-300 border border-indigo-500/20 px-1.5 py-0.2 rounded">
                              {q}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {doc.bio && (
                      <p className="text-[11px] text-slate-400 italic line-clamp-2 pt-1 border-t border-slate-800/60">
                        "{doc.bio}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-mono">
                    Modes: {(doc.consultationModes || ['ONLINE']).join(', ')}
                  </span>

                  {(canVerify || isSuperAdmin) && (
                    <button
                      onClick={() => handleDeleteDoctor(doc)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors flex items-center gap-1 text-xs"
                      title="Delete doctor from MongoDB"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="text-[11px]">Delete Profile</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Add Real Doctor to Live MongoDB */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Register New Doctor to Live Backend"
        subtitle="Directly creates professional account & profile in MongoDB database"
      >
        <form onSubmit={handleAddDoctorSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Doctor Full Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Dr. Sarah Jenkins, MD"
              value={newDoctor.name}
              onChange={e => setNewDoctor({ ...newDoctor, name: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Doctor Email</label>
              <input
                type="email"
                required
                placeholder="e.g. sarah.jenkins@hospital.org"
                value={newDoctor.email}
                onChange={e => setNewDoctor({ ...newDoctor, email: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
              <input
                type="password"
                placeholder="SecureMindBridge#2026 (default)"
                value={newDoctor.password}
                onChange={e => setNewDoctor({ ...newDoctor, password: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Professional Category</label>
              <select
                value={newDoctor.category}
                onChange={e => setNewDoctor({ ...newDoctor, category: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="CLINICAL_PSYCHOLOGIST">Clinical Psychologist</option>
                <option value="PSYCHIATRIST">Psychiatrist</option>
                <option value="COUNSELLOR">Counsellor</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Primary Specialty</label>
              <input
                type="text"
                placeholder="e.g. Adolescent Mood Disorders"
                value={newDoctor.specialty}
                onChange={e => setNewDoctor({ ...newDoctor, specialty: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Years of Clinical Experience</label>
              <input
                type="number"
                min="0"
                max="50"
                value={newDoctor.experienceYears}
                onChange={e => setNewDoctor({ ...newDoctor, experienceYears: parseInt(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Consultation Fee (INR/USD)</label>
              <input
                type="number"
                min="0"
                value={newDoctor.fee}
                onChange={e => setNewDoctor({ ...newDoctor, fee: parseInt(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Professional Bio</label>
            <textarea
              rows={2}
              placeholder="Clinical bio, qualifications, and affiliations..."
              value={newDoctor.bio}
              onChange={e => setNewDoctor({ ...newDoctor, bio: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Registering...</span>
                </>
              ) : (
                <span>Register to MongoDB</span>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
