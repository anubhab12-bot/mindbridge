import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  type OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  AppointmentStatus,
  type AppointmentSummary,
  ConsentType,
  type ConsultationMode,
  ModerationStatus,
  Role,
  SLOT_HOLDING_STATUSES,
} from '@mindbridge/shared-types';
import { type Model, type QueryFilter, Types } from 'mongoose';
import { AppConfigService } from '../../config/app-config.service.js';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user.js';
import { FieldEncryptionService } from '../../common/crypto/field-encryption.service.js';
import { formatForUser } from '../../common/utils/dates.js';
import { AuditService } from '../audit/audit.service.js';
import { AvailabilityService } from '../availability/availability.service.js';
import { CareService } from '../care/care.service.js';
import { ConsentService } from '../consent/consent.service.js';
import { DoctorsService } from '../doctors/doctors.service.js';
import { DoctorProfile } from '../doctors/schemas/doctor-profile.schema.js';
import { Feedback } from '../feedback/schemas/feedback.schema.js';
import { type IntakeAnswers, PatientIntake } from '../intake/schemas/patient-intake.schema.js';
import { MailService } from '../mail/mail.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { JobsService } from '../queues/jobs.service.js';
import { User } from '../users/schemas/user.schema.js';
import { Appointment, type AppointmentDocument, holdsSlot } from './schemas/appointment.schema.js';
import { VideoProvider } from './video.provider.js';

const REMINDER_JOB = 'appointment.reminder';
const REMINDER_OFFSETS = [
  { key: '24h', ms: 24 * 3600 * 1000 },
  { key: '1h', ms: 3600 * 1000 },
];

export interface BookInput {
  doctorId: string;
  startAt: string;
  mode: ConsultationMode;
  reasonForVisit?: string;
  patientTimezone?: string;
  intake?: IntakeAnswers;
  shareIntake?: boolean;
}

type Lean = Appointment & { _id: Types.ObjectId };

@Injectable()
export class AppointmentsService implements OnModuleInit {
  constructor(
    @InjectModel(Appointment.name) private readonly model: Model<Appointment>,
    @InjectModel(User.name) private readonly users: Model<User>,
    @InjectModel(DoctorProfile.name) private readonly doctorProfiles: Model<DoctorProfile>,
    @InjectModel(PatientIntake.name) private readonly intakes: Model<PatientIntake>,
    @InjectModel(Feedback.name) private readonly feedback: Model<Feedback>,
    private readonly doctors: DoctorsService,
    private readonly availability: AvailabilityService,
    private readonly care: CareService,
    private readonly consent: ConsentService,
    private readonly crypto: FieldEncryptionService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly mail: MailService,
    private readonly jobs: JobsService,
    private readonly config: AppConfigService,
    private readonly video: VideoProvider,
  ) {}

  onModuleInit() {
    this.jobs.register(REMINDER_JOB, (data) => this.sendReminder(String(data['appointmentId']), String(data['startAt'])));
  }

  // ---------------------------------------------------------------- booking (patient)

  async book(patient: AuthenticatedUser, input: BookInput) {
    const doctor = await this.doctors.findBookable(input.doctorId);
    if (!doctor) throw new NotFoundException({ code: 'NOT_FOUND', message: 'This professional is not accepting bookings.' });
    if (!doctor.consultationModes.includes(input.mode)) {
      throw new BadRequestException({ code: 'MODE_UNAVAILABLE', message: 'This professional does not offer that consultation type.' });
    }
    const startAt = new Date(input.startAt);
    if (Number.isNaN(+startAt)) throw new BadRequestException({ code: 'INVALID_TIME', message: 'Invalid start time.' });

    const slot = await this.availability.isBookable(doctor._id.toString(), startAt);
    if (!slot) throw new ConflictException({ code: 'SLOT_UNAVAILABLE', message: 'That time is no longer available. Please pick another.' });

    const patientId = new Types.ObjectId(patient.id);
    const clash = await this.model.exists({
      patientId,
      status: { $in: SLOT_HOLDING_STATUSES },
      startAt: { $lt: slot.endAt },
      endAt: { $gt: slot.startAt },
    });
    if (clash) throw new ConflictException({ code: 'PATIENT_CLASH', message: 'You already have an appointment at that time.' });

    let appt: AppointmentDocument;
    try {
      appt = await this.model.create({
        patientId,
        doctorProfileId: doctor._id,
        doctorUserId: doctor.userId,
        startAt: slot.startAt,
        endAt: slot.endAt,
        mode: input.mode,
        status: AppointmentStatus.REQUESTED,
        holdsSlot: true,
        patientTimezone: input.patientTimezone,
        reasonEnc: this.crypto.encryptOptional(input.reasonForVisit?.trim()),
        fee: doctor.consultationFee,
        history: [{ action: 'requested', actorRole: Role.PATIENT, actorId: patientId, at: new Date() }],
      });
    } catch (err) {
      // The partial unique index is the final guard against two concurrent bookings of one slot.
      if ((err as { code?: number }).code === 11000) {
        throw new ConflictException({ code: 'SLOT_UNAVAILABLE', message: 'That time was just taken. Please pick another.' });
      }
      throw err;
    }

    if (input.intake?.mainConcerns) {
      await this.intakes.create({
        patientId,
        appointmentId: appt._id,
        doctorProfileId: doctor._id,
        answersEnc: this.crypto.encrypt(JSON.stringify(input.intake)),
      });
      if (input.shareIntake) {
        await this.consent.record(patient.id, ConsentType.SHARE_INTAKE, true, { doctorId: doctor._id.toString(), source: 'booking' });
      }
    }

    await this.audit.record({ actorId: patient.id, actorRole: Role.PATIENT, action: 'appointment.requested', resourceType: 'Appointment', resourceId: appt._id.toString() });
    await this.notifyParty(appt.toObject(), 'doctor', 'New appointment request', '/doctor/appointments');
    return this.toSummary(appt.toObject(), patient);
  }

  // ---------------------------------------------------------------- reads

  private async loadForParticipant(user: AuthenticatedUser, id: string): Promise<AppointmentDocument> {
    const appt = await this.model.findById(id);
    if (!appt || !this.isParticipant(user, appt)) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Appointment not found.' });
    }
    return appt;
  }

  private isParticipant(user: AuthenticatedUser, appt: Appointment) {
    if (user.role === Role.PATIENT) return appt.patientId.toString() === user.id;
    if (user.role === Role.DOCTOR) return appt.doctorUserId.toString() === user.id;
    return false;
  }

  async getForParticipant(user: AuthenticatedUser, id: string) {
    const appt = await this.loadForParticipant(user, id);
    const summary = await this.toSummary(appt.toObject(), user);
    const intake = await this.intakeFor(user, appt);
    return { ...summary, history: appt.history.map((h) => ({ action: h.action, actorRole: h.actorRole, at: h.at })), outcome: appt.outcome, cancellation: appt.cancellation, intake };
  }

  private async intakeFor(user: AuthenticatedUser, appt: Appointment & { _id: Types.ObjectId }) {
    const intake = await this.intakes.findOne({ appointmentId: appt._id }).lean();
    if (!intake) return null;
    if (user.role === Role.PATIENT) return { shared: true, answers: JSON.parse(this.crypto.decrypt(intake.answersEnc)) as IntakeAnswers };
    const consented = await this.consent.has(appt.patientId.toString(), ConsentType.SHARE_INTAKE, appt.doctorProfileId.toString());
    if (!consented) return { shared: false };
    await this.audit.record({ actorId: user.id, actorRole: user.role, action: 'intake.viewed', resourceType: 'Appointment', resourceId: appt._id.toString() });
    return { shared: true, answers: JSON.parse(this.crypto.decrypt(intake.answersEnc)) as IntakeAnswers };
  }

  async listForPatient(patient: AuthenticatedUser, scope: 'upcoming' | 'past' | 'all', skip: number, limit: number) {
    const filter: QueryFilter<Appointment> = { patientId: new Types.ObjectId(patient.id) };
    const now = new Date();
    if (scope === 'upcoming') Object.assign(filter, { endAt: { $gte: now }, status: { $in: SLOT_HOLDING_STATUSES } });
    if (scope === 'past') Object.assign(filter, { $or: [{ endAt: { $lt: now } }, { status: { $nin: SLOT_HOLDING_STATUSES } }] });
    const sort = scope === 'upcoming' ? { startAt: 1 as const } : { startAt: -1 as const };
    const [items, total] = await Promise.all([
      this.model.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      this.model.countDocuments(filter),
    ]);
    return { items: await Promise.all(items.map((a) => this.toSummary(a, patient))), total };
  }

  async listForDoctor(doctor: AuthenticatedUser, q: { from?: Date; to?: Date; status?: AppointmentStatus; skip: number; limit: number }) {
    const filter: QueryFilter<Appointment> = { doctorUserId: new Types.ObjectId(doctor.id) };
    if (q.status) filter.status = q.status;
    if (q.from || q.to) filter.startAt = { ...(q.from ? { $gte: q.from } : {}), ...(q.to ? { $lt: q.to } : {}) };
    const [items, total] = await Promise.all([
      this.model.find(filter).sort({ startAt: 1 }).skip(q.skip).limit(q.limit).lean(),
      this.model.countDocuments(filter),
    ]);
    return { items: await Promise.all(items.map((a) => this.toSummary(a, doctor))), total };
  }

  async doctorStats(doctor: AuthenticatedUser) {
    const doctorUserId = new Types.ObjectId(doctor.id);
    const rows = await this.model.aggregate<{ _id: string; count: number }>([
      { $match: { doctorUserId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const byStatus = Object.fromEntries(rows.map((r) => [r._id, r.count]));
    const since = new Date(Date.now() - 30 * 86400_000);
    const last30 = await this.model.countDocuments({ doctorUserId, status: AppointmentStatus.COMPLETED, startAt: { $gte: since } });
    return { byStatus, completedLast30Days: last30 };
  }

  // ---------------------------------------------------------------- doctor actions

  private assertDoctorOwns(user: AuthenticatedUser, appt: Appointment) {
    if (user.role !== Role.DOCTOR || appt.doctorUserId.toString() !== user.id) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Appointment not found.' });
    }
  }

  private transition(appt: AppointmentDocument, to: AppointmentStatus, user: AuthenticatedUser, action: string, meta?: Record<string, unknown>) {
    appt.status = to;
    appt.holdsSlot = holdsSlot(to);
    appt.history.push({ action, actorRole: user.role, actorId: new Types.ObjectId(user.id), at: new Date(), meta });
  }

  async confirm(doctor: AuthenticatedUser, id: string) {
    const appt = await this.loadForParticipant(doctor, id);
    this.assertDoctorOwns(doctor, appt);
    if (appt.status !== AppointmentStatus.REQUESTED) throw this.invalidState(appt.status, 'confirm');
    if (appt.startAt <= new Date()) throw new ConflictException({ code: 'IN_PAST', message: 'This request has already passed.' });
    this.transition(appt, AppointmentStatus.CONFIRMED, doctor, 'confirmed');
    await appt.save();
    await this.care.establish(appt.doctorProfileId, appt.patientId);
    await this.scheduleReminders(appt);
    await this.afterChange(appt, doctor, 'appointment.confirmed', 'patient', 'Your appointment is confirmed');
    return this.toSummary(appt.toObject(), doctor);
  }

  async decline(doctor: AuthenticatedUser, id: string, reason?: string) {
    const appt = await this.loadForParticipant(doctor, id);
    this.assertDoctorOwns(doctor, appt);
    if (appt.status !== AppointmentStatus.REQUESTED) throw this.invalidState(appt.status, 'decline');
    appt.cancellation = { by: 'DOCTOR', reason: reason?.trim(), at: new Date(), late: false };
    this.transition(appt, AppointmentStatus.CANCELLED, doctor, 'declined');
    await appt.save();
    await this.afterChange(appt, doctor, 'appointment.declined', 'patient', 'Your appointment request was declined');
    return this.toSummary(appt.toObject(), doctor);
  }

  async complete(doctor: AuthenticatedUser, id: string, outcome: { summary?: string; followUpRecommended: boolean; followUpInWeeks?: number }) {
    const appt = await this.loadForParticipant(doctor, id);
    this.assertDoctorOwns(doctor, appt);
    if (appt.status !== AppointmentStatus.CONFIRMED) throw this.invalidState(appt.status, 'complete');
    if (appt.startAt > new Date()) throw new ConflictException({ code: 'NOT_STARTED', message: 'You can complete an appointment once it has started.' });
    appt.outcome = { ...outcome, summary: outcome.summary?.trim(), recordedAt: new Date() };
    this.transition(appt, AppointmentStatus.COMPLETED, doctor, 'completed');
    await appt.save();
    await this.cancelReminders(appt);
    await this.afterChange(appt, doctor, 'appointment.completed', 'patient', 'Your consultation is marked complete');
    return this.toSummary(appt.toObject(), doctor);
  }

  async markNoShow(doctor: AuthenticatedUser, id: string) {
    const appt = await this.loadForParticipant(doctor, id);
    this.assertDoctorOwns(doctor, appt);
    if (appt.status !== AppointmentStatus.CONFIRMED) throw this.invalidState(appt.status, 'mark as no-show');
    if (appt.startAt > new Date()) throw new ConflictException({ code: 'NOT_STARTED', message: 'You can only mark a no-show after the start time.' });
    this.transition(appt, AppointmentStatus.NO_SHOW, doctor, 'no_show');
    await appt.save();
    await this.afterChange(appt, doctor, 'appointment.no_show', 'patient', 'An appointment was marked as missed');
    return this.toSummary(appt.toObject(), doctor);
  }

  // ---------------------------------------------------------------- either participant

  async cancel(user: AuthenticatedUser, id: string, reason?: string) {
    const appt = await this.loadForParticipant(user, id);
    if (!SLOT_HOLDING_STATUSES.includes(appt.status)) throw this.invalidState(appt.status, 'cancel');
    if (appt.startAt <= new Date()) throw new ConflictException({ code: 'IN_PAST', message: 'Appointments that have started cannot be cancelled.' });
    const noticeMs = this.config.get('CANCELLATION_NOTICE_HOURS') * 3600_000;
    const late = user.role === Role.PATIENT && +appt.startAt - Date.now() < noticeMs && appt.status === AppointmentStatus.CONFIRMED;
    appt.cancellation = { by: user.role === Role.PATIENT ? 'PATIENT' : 'DOCTOR', reason: reason?.trim(), at: new Date(), late };
    this.transition(appt, AppointmentStatus.CANCELLED, user, 'cancelled', { late });
    await appt.save();
    await this.cancelReminders(appt);
    await this.afterChange(appt, user, 'appointment.cancelled', user.role === Role.PATIENT ? 'doctor' : 'patient', 'An appointment was cancelled');
    return this.toSummary(appt.toObject(), user);
  }

  async reschedule(user: AuthenticatedUser, id: string, newStart: string) {
    const appt = await this.loadForParticipant(user, id);
    if (!SLOT_HOLDING_STATUSES.includes(appt.status)) throw this.invalidState(appt.status, 'reschedule');
    const noticeMs = this.config.get('CANCELLATION_NOTICE_HOURS') * 3600_000;
    if (user.role === Role.PATIENT && appt.status === AppointmentStatus.CONFIRMED && +appt.startAt - Date.now() < noticeMs) {
      throw new ConflictException({
        code: 'TOO_LATE_TO_RESCHEDULE',
        message: `Appointments can be rescheduled up to ${this.config.get('CANCELLATION_NOTICE_HOURS')} hours before they start.`,
      });
    }
    if (appt.rescheduleCount >= 3) throw new ConflictException({ code: 'RESCHEDULE_LIMIT', message: 'This appointment has been rescheduled too many times. Please book a new one.' });
    const startAt = new Date(newStart);
    const slot = await this.availability.isBookable(appt.doctorProfileId.toString(), startAt);
    if (!slot) throw new ConflictException({ code: 'SLOT_UNAVAILABLE', message: 'That time is not available.' });

    const previous = appt.startAt;
    appt.startAt = slot.startAt;
    appt.endAt = slot.endAt;
    appt.rescheduleCount += 1;
    // A patient-initiated move needs the professional to confirm again.
    const next = user.role === Role.PATIENT ? AppointmentStatus.REQUESTED : appt.status;
    this.transition(appt, next, user, 'rescheduled', { from: previous.toISOString() });
    try {
      await appt.save();
    } catch (err) {
      if ((err as { code?: number }).code === 11000) throw new ConflictException({ code: 'SLOT_UNAVAILABLE', message: 'That time was just taken.' });
      throw err;
    }
    await this.cancelReminders(appt, previous);
    if (appt.status === AppointmentStatus.CONFIRMED) await this.scheduleReminders(appt);
    await this.afterChange(appt, user, 'appointment.rescheduled', user.role === Role.PATIENT ? 'doctor' : 'patient', 'An appointment was rescheduled');
    return this.toSummary(appt.toObject(), user);
  }

  async updateReason(patient: AuthenticatedUser, id: string, reason: string | undefined) {
    const appt = await this.loadForParticipant(patient, id);
    if (patient.role !== Role.PATIENT) throw new ForbiddenException();
    if (!SLOT_HOLDING_STATUSES.includes(appt.status)) throw this.invalidState(appt.status, 'edit');
    appt.reasonEnc = this.crypto.encryptOptional(reason?.trim());
    appt.history.push({ action: 'reason_updated', actorRole: Role.PATIENT, actorId: new Types.ObjectId(patient.id), at: new Date() });
    await appt.save();
    return this.toSummary(appt.toObject(), patient);
  }

  async videoAccess(user: AuthenticatedUser, id: string) {
    const appt = await this.loadForParticipant(user, id);
    if (appt.status !== AppointmentStatus.CONFIRMED || appt.mode !== 'ONLINE') {
      throw new ConflictException({ code: 'NOT_JOINABLE', message: 'This appointment is not an online consultation that is confirmed.' });
    }
    const now = Date.now();
    if (now < +appt.startAt - 15 * 60_000 || now > +appt.endAt) {
      throw new ConflictException({ code: 'NOT_JOINABLE_YET', message: 'You can join from 15 minutes before the start time.' });
    }
    await this.audit.record({ actorId: user.id, actorRole: user.role, action: 'appointment.video_access', resourceType: 'Appointment', resourceId: id });
    return this.video.createAccess(id, user.id, appt.endAt);
  }

  async submitFeedback(patient: AuthenticatedUser, id: string, rating: number, comment?: string) {
    const appt = await this.loadForParticipant(patient, id);
    if (patient.role !== Role.PATIENT) throw new ForbiddenException();
    if (appt.status !== AppointmentStatus.COMPLETED) throw new ConflictException({ code: 'NOT_COMPLETED', message: 'You can rate a consultation after it is completed.' });
    try {
      await this.feedback.create({
        appointmentId: appt._id,
        patientId: appt.patientId,
        doctorProfileId: appt.doctorProfileId,
        rating,
        comment: comment?.trim(),
        moderationStatus: ModerationStatus.PENDING,
      });
    } catch (err) {
      if ((err as { code?: number }).code === 11000) throw new ConflictException({ code: 'ALREADY_RATED', message: 'You have already rated this consultation.' });
      throw err;
    }
    return { submitted: true, moderation: ModerationStatus.PENDING };
  }

  // ---------------------------------------------------------------- reminders and notices

  private async scheduleReminders(appt: Appointment & { _id: Types.ObjectId }) {
    for (const r of REMINDER_OFFSETS) {
      const delay = +appt.startAt - r.ms - Date.now();
      if (delay <= 0) continue;
      await this.jobs.dispatch(
        REMINDER_JOB,
        { appointmentId: appt._id.toString(), startAt: appt.startAt.toISOString() },
        { delay, jobId: `appt-${appt._id.toString()}-${r.key}-${+appt.startAt}` },
      );
    }
  }

  private async cancelReminders(appt: Appointment & { _id: Types.ObjectId }, startAt: Date = appt.startAt) {
    for (const r of REMINDER_OFFSETS) await this.jobs.cancel(`appt-${appt._id.toString()}-${r.key}-${+startAt}`);
  }

  /** Reminder jobs re-check state so a stale job never reminds about a moved or cancelled appointment. */
  async sendReminder(appointmentId: string, startAtIso: string) {
    const appt = await this.model.findById(appointmentId).lean();
    if (!appt || appt.status !== AppointmentStatus.CONFIRMED || appt.startAt.toISOString() !== startAtIso) return;
    for (const party of ['patient', 'doctor'] as const) {
      const userId = party === 'patient' ? appt.patientId : appt.doctorUserId;
      const user = await this.users.findById(userId).select('email displayName timezone').lean();
      if (!user) continue;
      const path = party === 'patient' ? `/patient/appointments/${appointmentId}` : `/doctor/appointments/${appointmentId}`;
      await this.notifications.notify(userId, { type: 'appointment.reminder', title: 'Upcoming appointment', body: formatForUser(appt.startAt, user.timezone), link: path });
      await this.mail.send(user.email, 'appointment-reminder', { name: user.displayName, when: formatForUser(appt.startAt, user.timezone), path });
    }
  }

  private async afterChange(appt: AppointmentDocument, actor: AuthenticatedUser, action: string, notify: 'patient' | 'doctor', title: string) {
    await this.audit.record({ actorId: actor.id, actorRole: actor.role, action, resourceType: 'Appointment', resourceId: appt._id.toString() });
    await this.notifyParty(appt.toObject(), notify, title, notify === 'patient' ? '/patient/appointments' : '/doctor/appointments');
  }

  private async notifyParty(appt: Lean, party: 'patient' | 'doctor', title: string, basePath: string) {
    const userId = party === 'patient' ? appt.patientId : appt.doctorUserId;
    const user = await this.users.findById(userId).select('email displayName timezone').lean();
    if (!user) return;
    const when = formatForUser(appt.startAt, user.timezone);
    const path = `${basePath}/${appt._id.toString()}`;
    await this.notifications.notify(userId, { type: 'appointment.updated', title, body: when, link: path });
    await this.mail.send(user.email, 'appointment-update', { name: user.displayName, when, status: appt.status, path });
  }

  private invalidState(status: AppointmentStatus, verb: string) {
    return new ConflictException({ code: 'INVALID_STATE', message: `You cannot ${verb} an appointment that is ${status.toLowerCase().replace('_', ' ')}.` });
  }

  // ---------------------------------------------------------------- views

  async toSummary(a: Lean, viewer: AuthenticatedUser): Promise<AppointmentSummary> {
    const [doctor, patient] = await Promise.all([
      this.doctorProfiles.findById(a.doctorProfileId).select('displayName professionalCategory').lean(),
      viewer.role === Role.DOCTOR ? this.users.findById(a.patientId).select('displayName').lean() : null,
    ]);
    const now = Date.now();
    const holding = SLOT_HOLDING_STATUSES.includes(a.status) && +a.startAt > now;
    return {
      id: a._id.toString(),
      status: a.status,
      startAt: a.startAt.toISOString(),
      endAt: a.endAt.toISOString(),
      mode: a.mode,
      doctor: {
        id: a.doctorProfileId.toString(),
        displayName: doctor?.displayName ?? 'Professional',
        professionalCategory: doctor?.professionalCategory ?? 'COUNSELLOR',
      },
      patient: patient ? { id: a.patientId.toString(), displayName: patient.displayName } : undefined,
      reasonForVisit: this.crypto.decryptOptional(a.reasonEnc),
      canCancel: holding,
      canReschedule: holding,
    };
  }

  // ---------------------------------------------------------------- admin aggregates (no content)

  async countsByStatus(since?: Date) {
    const match = since ? { createdAt: { $gte: since } } : {};
    return this.model.aggregate<{ _id: string; count: number }>([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 } } }]);
  }

  async weeklyTrend(weeks: number) {
    const since = new Date(Date.now() - weeks * 7 * 86400_000);
    return this.model.aggregate<{ _id: string; count: number }>([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: '%G-W%V', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
  }

  async cancelAllFutureForDoctor(doctorProfileId: string, reason: string) {
    const items = await this.model.find({ doctorProfileId: new Types.ObjectId(doctorProfileId), status: { $in: SLOT_HOLDING_STATUSES }, startAt: { $gt: new Date() } });
    for (const appt of items) {
      appt.cancellation = { by: 'SYSTEM', reason, at: new Date(), late: false };
      appt.status = AppointmentStatus.CANCELLED;
      appt.holdsSlot = undefined;
      appt.history.push({ action: 'cancelled_by_system', actorRole: 'SYSTEM', at: new Date() });
      await appt.save();
      await this.cancelReminders(appt);
      await this.notifyParty(appt.toObject(), 'patient', 'An appointment was cancelled', '/patient/appointments');
    }
    return items.length;
  }
}
