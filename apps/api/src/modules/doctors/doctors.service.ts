import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  AccountStatus,
  type ConsultationMode,
  type DoctorPublicProfile,
  DoctorVerificationStatus,
  type ProfessionalCategory,
} from '@mindbridge/shared-types';
import { type Model, type QueryFilter, Types } from 'mongoose';
import { isValidTimeZone } from '../../common/utils/dates.js';
import { AuditService } from '../audit/audit.service.js';
import { User } from '../users/schemas/user.schema.js';
import { DoctorProfile, type WorkingHours } from './schemas/doctor-profile.schema.js';

export interface DoctorSearch {
  q?: string;
  specialty?: string;
  language?: string;
  category?: ProfessionalCategory;
  mode?: ConsultationMode;
  maxFee?: number;
  availableOn?: number;
  skip: number;
  limit: number;
}

export interface UpdateDoctorProfile {
  bio?: string;
  qualifications?: string[];
  specialties?: string[];
  languages?: string[];
  yearsExperience?: number;
  consultationFee?: { amount: number; currency: string };
  consultationModes?: ConsultationMode[];
  slotDurationMinutes?: number;
  timezone?: string;
  clinicAddress?: string;
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

@Injectable()
export class DoctorsService {
  constructor(
    @InjectModel(DoctorProfile.name) private readonly doctors: Model<DoctorProfile>,
    @InjectModel(User.name) private readonly users: Model<User>,
    private readonly audit: AuditService,
  ) {}

  toPublic(d: DoctorProfile & { _id: Types.ObjectId }): DoctorPublicProfile {
    return {
      id: d._id.toString(),
      displayName: d.displayName,
      professionalCategory: d.professionalCategory,
      qualifications: d.qualifications,
      specialties: d.specialties,
      languages: d.languages,
      yearsExperience: d.yearsExperience,
      bio: d.bio,
      consultationFee: d.consultationFee,
      consultationModes: d.consultationModes,
      slotDurationMinutes: d.slotDurationMinutes,
      timezone: d.timezone,
      verified: d.verificationStatus === DoctorVerificationStatus.APPROVED,
      // Ratings are shown only once there are enough to avoid identifying individual reviewers.
      ratingAverage: d.ratingCount >= 3 ? Math.round((d.ratingSum / d.ratingCount) * 10) / 10 : null,
      ratingCount: d.ratingCount >= 3 ? d.ratingCount : 0,
    };
  }

  private async activeDoctorUserIds(): Promise<Types.ObjectId[]> {
    const rows = await this.users.find({ role: 'DOCTOR', status: AccountStatus.ACTIVE }).select('_id').lean();
    return rows.map((r) => r._id);
  }

  /** Top professionals ranked by years of clinical experience. */
  async getTopExperienced(limit = 3): Promise<DoctorPublicProfile[]> {
    const activeDoctorIds = await this.activeDoctorUserIds();
    // Query approved active doctors sorted by yearsExperience descending
    let rows = await this.doctors
      .find({
        verificationStatus: DoctorVerificationStatus.APPROVED,
        userId: { $in: activeDoctorIds },
      })
      .sort({ yearsExperience: -1, ratingCount: -1, _id: 1 })
      .limit(limit)
      .lean();

    // If fewer than limit in staging/dev DB, include any approved doctor profiles
    if (rows.length < limit) {
      const extra = await this.doctors
        .find({
          _id: { $nin: rows.map((r) => r._id) },
        })
        .sort({ yearsExperience: -1, _id: 1 })
        .limit(limit - rows.length)
        .lean();
      rows = [...rows, ...extra];
    }

    return rows.map((d) => this.toPublic(d as DoctorProfile & { _id: Types.ObjectId }));
  }

  /** Public directory: only real approved professionals whose account is ACTIVE are returned (demo excluded). */
  async search(s: DoctorSearch) {
    const activeDoctorIds = await this.activeDoctorUserIds();
    const filter: QueryFilter<DoctorProfile> = {
      verificationStatus: DoctorVerificationStatus.APPROVED,
      displayName: { $not: /\(demo\)/i },
      userId: { $in: activeDoctorIds },
    };
    if (s.specialty) filter.specialties = { $regex: `^${escapeRegex(s.specialty)}$`, $options: 'i' };
    if (s.language) filter.languages = s.language;
    if (s.category) filter.professionalCategory = s.category;
    if (s.mode) filter.consultationModes = s.mode;
    if (s.maxFee !== undefined) filter['consultationFee.amount'] = { $lte: s.maxFee };
    if (s.availableOn !== undefined) filter['workingHours.dayOfWeek'] = s.availableOn;
    if (s.q) {
      const rx = { $regex: escapeRegex(s.q.slice(0, 60)), $options: 'i' };
      filter.$or = [{ displayName: rx }, { specialties: rx }, { bio: rx }];
    }
    const [items, total] = await Promise.all([
      this.doctors.find(filter).sort({ ratingCount: -1, yearsExperience: -1, _id: 1 }).skip(s.skip).limit(s.limit).lean(),
      this.doctors.countDocuments(filter),
    ]);
    return { items: items.map((d) => this.toPublic(d)), total };
  }

  async getPublic(id: string): Promise<DoctorPublicProfile> {
    const d = await this.findBookable(id);
    if (!d) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Professional not found.' });
    return this.toPublic(d);
  }

  /** Returns the profile only if the professional may currently receive bookings. */
  async findBookable(id: string) {
    if (!Types.ObjectId.isValid(id)) return null;
    const d = await this.doctors.findOne({ _id: new Types.ObjectId(id), verificationStatus: DoctorVerificationStatus.APPROVED, displayName: { $not: /\(demo\)/i } }).lean();
    if (!d) return null;
    const active = await this.users.exists({ _id: d.userId, status: AccountStatus.ACTIVE });
    return active ? d : null;
  }

  async facets() {
    const activeDoctorIds = await this.activeDoctorUserIds();
    const match = { verificationStatus: DoctorVerificationStatus.APPROVED, displayName: { $not: /\(demo\)/i }, userId: { $in: activeDoctorIds } };
    const [specialties, languages] = await Promise.all([
      this.doctors.distinct('specialties', match),
      this.doctors.distinct('languages', match),
    ]);
    return { specialties: specialties.sort(), languages: languages.sort() };
  }

  // ---------------------------------------------------------------- own profile (doctor)

  async getOwn(userId: string) {
    const d = await this.doctors.findOne({ userId: new Types.ObjectId(userId) }).lean();
    if (!d) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Profile not found.' });
    return {
      ...this.toPublic(d),
      registrationNumber: d.registrationNumber,
      registrationCouncil: d.registrationCouncil,
      verificationStatus: d.verificationStatus,
      verifiedAt: d.verifiedAt,
      workingHours: d.workingHours,
      clinicAddress: d.clinicAddress,
      completeness: this.completeness(d),
    };
  }

  completeness(d: DoctorProfile) {
    const checks = [
      { key: 'bio', done: (d.bio ?? '').length >= 80, label: 'Write a short biography' },
      { key: 'workingHours', done: d.workingHours.length > 0, label: 'Set your working hours' },
      { key: 'fee', done: d.consultationFee.amount > 0, label: 'Set your consultation fee' },
      { key: 'languages', done: d.languages.length > 0, label: 'Add languages you speak' },
      { key: 'specialties', done: d.specialties.length > 0, label: 'Add your areas of focus' },
      { key: 'qualifications', done: d.qualifications.length > 0, label: 'List your qualifications' },
    ];
    return { percent: Math.round((checks.filter((c) => c.done).length / checks.length) * 100), checks };
  }

  /** Verification fields, registration number and status are deliberately not updatable here. */
  async updateOwn(userId: string, dto: UpdateDoctorProfile) {
    if (dto.timezone && !isValidTimeZone(dto.timezone)) {
      throw new BadRequestException({ code: 'INVALID_TIMEZONE', message: 'Unknown timezone.' });
    }
    const set: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(dto)) if (v !== undefined) set[k] = v;
    const d = await this.doctors.findOneAndUpdate({ userId: new Types.ObjectId(userId) }, { $set: set }, { new: true, runValidators: true });
    if (!d) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Profile not found.' });
    await this.audit.record({ actorId: userId, actorRole: 'DOCTOR', action: 'doctor.profile_updated', metadata: { fields: Object.keys(set) } });
    return this.getOwn(userId);
  }

  async setWorkingHours(userId: string, hours: WorkingHours[]) {
    for (const h of hours) {
      if (h.end <= h.start) throw new BadRequestException({ code: 'INVALID_HOURS', message: 'Each block must end after it starts.' });
    }
    const byDay = new Map<number, WorkingHours[]>();
    for (const h of hours) byDay.set(h.dayOfWeek, [...(byDay.get(h.dayOfWeek) ?? []), h]);
    for (const list of byDay.values()) {
      const sorted = list.sort((a, b) => a.start.localeCompare(b.start));
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i]!.start < sorted[i - 1]!.end) {
          throw new BadRequestException({ code: 'OVERLAPPING_HOURS', message: 'Working hours on the same day must not overlap.' });
        }
      }
    }
    await this.doctors.updateOne({ userId: new Types.ObjectId(userId) }, { $set: { workingHours: hours } });
    await this.audit.record({ actorId: userId, actorRole: 'DOCTOR', action: 'doctor.working_hours_updated' });
    return this.getOwn(userId);
  }

  async findByUserId(userId: string) {
    return this.doctors.findOne({ userId: new Types.ObjectId(userId) }).lean();
  }

  async findById(id: string) {
    return Types.ObjectId.isValid(id) ? this.doctors.findById(id).lean() : null;
  }
}
