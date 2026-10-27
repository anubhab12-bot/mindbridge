import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { AppointmentStatus, ClinicalNoteStatus, ConsentType, DoctorAssistTask } from '@mindbridge/shared-types';
import { type Model, Types } from 'mongoose';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user.js';
import { FieldEncryptionService } from '../../common/crypto/field-encryption.service.js';
import { AiChatService } from '../ai/ai-chat.service.js';
import { AiClientService, AiServiceUnavailableError } from '../ai/ai-client.service.js';
import { AiInteraction } from '../ai/schemas/ai-interaction.schema.js';
import { Appointment } from '../appointments/schemas/appointment.schema.js';
import { AuditService } from '../audit/audit.service.js';
import { CareService } from '../care/care.service.js';
import { ConsentService } from '../consent/consent.service.js';
import { DoctorProfile } from '../doctors/schemas/doctor-profile.schema.js';
import { type IntakeAnswers, PatientIntake } from '../intake/schemas/patient-intake.schema.js';
import { MoodService } from '../mood/mood.service.js';
import { PatientProfile } from '../patients/schemas/patient-profile.schema.js';
import { User } from '../users/schemas/user.schema.js';
import type { AiAssistDto, CreateNoteDto, UpdateNoteDto } from './clinical.dto.js';
import { AiDraft } from './schemas/ai-draft.schema.js';
import { ClinicalNote } from './schemas/clinical-note.schema.js';

type LeanNote = ClinicalNote & { _id: Types.ObjectId };

/**
 * Everything a professional can see or write about a patient. Each entry point first calls
 * CareService.assertDoctorCanAccess (approved professional + active care relationship, audited,
 * 404 otherwise) and then checks the patient's per-professional consent for shared data.
 */
@Injectable()
export class ClinicalService {
  constructor(
    @InjectModel(ClinicalNote.name) private readonly notes: Model<ClinicalNote>,
    @InjectModel(AiDraft.name) private readonly drafts: Model<AiDraft>,
    @InjectModel(AiInteraction.name) private readonly interactions: Model<AiInteraction>,
    @InjectModel(User.name) private readonly users: Model<User>,
    @InjectModel(PatientProfile.name) private readonly profiles: Model<PatientProfile>,
    @InjectModel(Appointment.name) private readonly appointments: Model<Appointment>,
    @InjectModel(PatientIntake.name) private readonly intakes: Model<PatientIntake>,
    @InjectModel(DoctorProfile.name) private readonly doctorProfiles: Model<DoctorProfile>,
    private readonly care: CareService,
    private readonly consent: ConsentService,
    private readonly mood: MoodService,
    private readonly aiChat: AiChatService,
    private readonly ai: AiClientService,
    private readonly crypto: FieldEncryptionService,
    private readonly audit: AuditService,
  ) {}

  private async requireConsent(patientId: string, doctor: AuthenticatedUser, type: ConsentType) {
    if (!(await this.consent.has(patientId, type, doctor.doctorProfileId))) {
      throw new ForbiddenException({ code: 'CONSENT_REQUIRED', message: 'The patient has not shared this information with you.' });
    }
  }

  // ------------------------------------------------------------------ patients

  async listPatients(doctor: AuthenticatedUser) {
    const doctorProfileId = this.care.assertIsDoctor(doctor);
    const rels = await this.care.listPatientIdsForDoctor(doctorProfileId);
    const ids = rels.map((r) => r.patientId);
    const [users, upcoming] = await Promise.all([
      this.users.find({ _id: { $in: ids } }).select('displayName').lean(),
      this.appointments.aggregate<{ _id: Types.ObjectId; next: Date }>([
        {
          $match: {
            doctorProfileId: new Types.ObjectId(doctorProfileId),
            patientId: { $in: ids },
            status: AppointmentStatus.CONFIRMED,
            startAt: { $gte: new Date() },
          },
        },
        { $group: { _id: '$patientId', next: { $min: '$startAt' } } },
      ]),
    ]);
    const names = new Map(users.map((u) => [u._id.toString(), u.displayName]));
    const next = new Map(upcoming.map((u) => [u._id.toString(), u.next]));
    return rels.map((r) => ({
      patientId: r.patientId.toString(),
      displayName: names.get(r.patientId.toString()) ?? 'Patient',
      careSince: r.establishedAt,
      nextAppointmentAt: next.get(r.patientId.toString()) ?? null,
    }));
  }

  async patientOverview(doctor: AuthenticatedUser, patientId: string) {
    await this.care.assertDoctorCanAccess(doctor, patientId, 'overview');
    const [user, profile, appts, consents] = await Promise.all([
      this.users.findById(patientId).select('displayName timezone').lean(),
      this.profiles.findOne({ userId: new Types.ObjectId(patientId) }).select('pronouns preferredLanguage').lean(),
      this.appointments
        .find({ patientId: new Types.ObjectId(patientId), doctorProfileId: new Types.ObjectId(doctor.doctorProfileId) })
        .select('startAt endAt mode status')
        .sort({ startAt: -1 })
        .limit(20)
        .lean(),
      this.consent.currentStates(patientId),
    ]);
    const shared = consents.filter((c) => c.granted && c.doctorId === doctor.doctorProfileId).map((c) => c.type);
    // Minimum necessary: name, pronouns, language, timezone, our appointments, what they chose to share.
    return {
      patientId,
      displayName: user?.displayName ?? 'Patient',
      pronouns: profile?.pronouns ?? null,
      preferredLanguage: profile?.preferredLanguage ?? null,
      timezone: user?.timezone ?? null,
      appointments: appts.map((a) => ({ id: a._id.toString(), startAt: a.startAt, endAt: a.endAt, mode: a.mode, status: a.status })),
      sharedWithYou: {
        moodSummary: shared.includes(ConsentType.SHARE_MOOD_SUMMARY),
        aiSummary: shared.includes(ConsentType.SHARE_AI_SUMMARY),
        intake: shared.includes(ConsentType.SHARE_INTAKE),
        aiAssist: shared.includes(ConsentType.DOCTOR_AI_ASSIST),
      },
    };
  }

  async moodSummary(doctor: AuthenticatedUser, patientId: string) {
    await this.care.assertDoctorCanAccess(doctor, patientId, 'mood_summary');
    await this.requireConsent(patientId, doctor, ConsentType.SHARE_MOOD_SUMMARY);
    return this.mood.summaryForDoctor(patientId, 30);
  }

  async aiSummary(doctor: AuthenticatedUser, patientId: string) {
    await this.care.assertDoctorCanAccess(doctor, patientId, 'ai_summary');
    return this.aiChat.professionalSummary(patientId, doctor.doctorProfileId!);
  }

  private async intakeAnswers(doctor: AuthenticatedUser, patientId: string, appointmentId?: string) {
    const filter: Record<string, unknown> = {
      patientId: new Types.ObjectId(patientId),
      doctorProfileId: new Types.ObjectId(doctor.doctorProfileId),
    };
    if (appointmentId) filter['appointmentId'] = new Types.ObjectId(appointmentId);
    const rows = await this.intakes.find(filter).sort({ createdAt: -1 }).limit(10).lean();
    return rows.map((r) => ({
      appointmentId: r.appointmentId.toString(),
      createdAt: r.createdAt,
      answers: JSON.parse(this.crypto.decrypt(r.answersEnc)) as IntakeAnswers,
    }));
  }

  async sharedIntakes(doctor: AuthenticatedUser, patientId: string) {
    await this.care.assertDoctorCanAccess(doctor, patientId, 'intake');
    await this.requireConsent(patientId, doctor, ConsentType.SHARE_INTAKE);
    return this.intakeAnswers(doctor, patientId);
  }

  // --------------------------------------------------------------------- notes

  private toNote(n: LeanNote) {
    return {
      id: n._id.toString(),
      patientId: n.patientId.toString(),
      appointmentId: n.appointmentId?.toString() ?? null,
      type: n.type,
      status: n.status,
      title: this.crypto.decrypt(n.titleEnc),
      content: this.crypto.decrypt(n.contentEnc),
      aiAssisted: Boolean(n.aiProvenance),
      aiProvenance: n.aiProvenance ?? null,
      finalizedAt: n.finalizedAt ?? null,
      addenda: n.addenda.map((a) => ({ id: a._id.toString(), content: this.crypto.decrypt(a.contentEnc), createdAt: a.createdAt })),
      createdAt: n.createdAt,
      updatedAt: n.updatedAt,
    };
  }

  async listNotes(doctor: AuthenticatedUser, patientId: string, skip: number, limit: number) {
    await this.care.assertDoctorCanAccess(doctor, patientId, 'notes.list');
    const filter = { doctorProfileId: new Types.ObjectId(doctor.doctorProfileId), patientId: new Types.ObjectId(patientId) };
    const [rows, total] = await Promise.all([
      this.notes.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean<LeanNote[]>(),
      this.notes.countDocuments(filter),
    ]);
    return { items: rows.map((n) => this.toNote(n)), total };
  }

  async createNote(doctor: AuthenticatedUser, patientId: string, dto: CreateNoteDto) {
    await this.care.assertDoctorCanAccess(doctor, patientId, 'notes.create');
    if (dto.appointmentId) {
      const ok = await this.appointments.exists({
        _id: new Types.ObjectId(dto.appointmentId),
        patientId: new Types.ObjectId(patientId),
        doctorProfileId: new Types.ObjectId(doctor.doctorProfileId),
      });
      if (!ok) throw new BadRequestException({ code: 'INVALID_APPOINTMENT', message: 'That appointment is not with this patient.' });
    }
    let aiProvenance;
    if (dto.fromDraftId) {
      const draft = await this.drafts.findOne({ _id: new Types.ObjectId(dto.fromDraftId), doctorProfileId: new Types.ObjectId(doctor.doctorProfileId) }).lean();
      if (!draft) throw new BadRequestException({ code: 'INVALID_DRAFT', message: 'That AI draft is no longer available.' });
      aiProvenance = { task: draft.task, provider: draft.provider, model: draft.model, isMock: draft.isMock, draftedAt: draft.createdAt };
    }
    const note = await this.notes.create({
      doctorProfileId: new Types.ObjectId(doctor.doctorProfileId),
      authorUserId: new Types.ObjectId(doctor.id),
      patientId: new Types.ObjectId(patientId),
      appointmentId: dto.appointmentId ? new Types.ObjectId(dto.appointmentId) : undefined,
      type: dto.type,
      titleEnc: this.crypto.encrypt(dto.title),
      contentEnc: this.crypto.encrypt(dto.content),
      aiProvenance,
    });
    await this.audit.record({
      actorId: doctor.id, actorRole: doctor.role, action: 'clinical_note.created', resourceType: 'ClinicalNote',
      resourceId: note._id.toString(), metadata: { patientId, aiAssisted: Boolean(aiProvenance) },
    });
    return this.toNote(note.toObject());
  }

  private async ownNote(doctor: AuthenticatedUser, id: string) {
    const note = await this.notes.findOne({ _id: new Types.ObjectId(id), doctorProfileId: new Types.ObjectId(doctor.doctorProfileId) });
    if (!note) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Note not found.' });
    // The care relationship must still be active to read or change the note via the portal.
    await this.care.assertDoctorCanAccess(doctor, note.patientId.toString(), 'notes.read');
    return note;
  }

  async getNote(doctor: AuthenticatedUser, id: string) {
    return this.toNote((await this.ownNote(doctor, id)).toObject());
  }

  async updateNote(doctor: AuthenticatedUser, id: string, dto: UpdateNoteDto) {
    const note = await this.ownNote(doctor, id);
    if (note.status === ClinicalNoteStatus.FINAL) {
      throw new ConflictException({ code: 'NOTE_FINAL', message: 'Final notes cannot be edited. Add an addendum instead.' });
    }
    if (dto.title !== undefined) note.titleEnc = this.crypto.encrypt(dto.title);
    if (dto.content !== undefined) note.contentEnc = this.crypto.encrypt(dto.content);
    await note.save();
    await this.audit.record({ actorId: doctor.id, actorRole: doctor.role, action: 'clinical_note.updated', resourceType: 'ClinicalNote', resourceId: id });
    return this.toNote(note.toObject());
  }

  async finalizeNote(doctor: AuthenticatedUser, id: string) {
    const note = await this.ownNote(doctor, id);
    if (note.status === ClinicalNoteStatus.FINAL) return this.toNote(note.toObject());
    note.status = ClinicalNoteStatus.FINAL;
    note.finalizedAt = new Date();
    await note.save();
    await this.audit.record({
      actorId: doctor.id, actorRole: doctor.role, action: 'clinical_note.finalized', resourceType: 'ClinicalNote',
      resourceId: id, metadata: { aiAssisted: Boolean(note.aiProvenance) },
    });
    return this.toNote(note.toObject());
  }

  async addAddendum(doctor: AuthenticatedUser, id: string, content: string) {
    const note = await this.ownNote(doctor, id);
    if (note.status !== ClinicalNoteStatus.FINAL) {
      throw new ConflictException({ code: 'NOTE_NOT_FINAL', message: 'Edit the draft directly; addenda are for final notes.' });
    }
    note.addenda.push({ contentEnc: this.crypto.encrypt(content) } as never);
    await note.save();
    await this.audit.record({ actorId: doctor.id, actorRole: doctor.role, action: 'clinical_note.addendum', resourceType: 'ClinicalNote', resourceId: id });
    return this.toNote(note.toObject());
  }

  async deleteDraft(doctor: AuthenticatedUser, id: string) {
    const note = await this.ownNote(doctor, id);
    if (note.status === ClinicalNoteStatus.FINAL) {
      throw new ConflictException({ code: 'NOTE_FINAL', message: 'Final notes cannot be deleted.' });
    }
    await note.deleteOne();
    await this.audit.record({ actorId: doctor.id, actorRole: doctor.role, action: 'clinical_note.draft_deleted', resourceType: 'ClinicalNote', resourceId: id });
  }

  // ------------------------------------------------------------------ AI assist

  /**
   * Generates a draft for the professional to review. Patient context is assembled here, from
   * data the professional is already authorized to see; the AI service never queries data.
   */
  async aiAssist(doctor: AuthenticatedUser, dto: AiAssistDto) {
    const doctorProfileId = this.care.assertIsDoctor(doctor);
    const profile = await this.doctorProfiles.findById(doctorProfileId).select('professionalCategory').lean();
    const context: Record<string, string> = {};
    const patientTasks: DoctorAssistTask[] = [
      DoctorAssistTask.SUMMARIZE_INTAKE,
      DoctorAssistTask.SUMMARIZE_AUTHORIZED_CONVERSATION,
      DoctorAssistTask.ORGANIZE_CONCERNS,
      DoctorAssistTask.SUGGEST_QUESTIONS,
    ];
    if (patientTasks.includes(dto.task) && !dto.patientId) {
      throw new BadRequestException({ code: 'PATIENT_REQUIRED', message: 'Choose a patient for this task.' });
    }
    if (dto.patientId) {
      await this.care.assertDoctorCanAccess(doctor, dto.patientId, 'ai_assist');
      await this.requireConsent(dto.patientId, doctor, ConsentType.DOCTOR_AI_ASSIST);
      if (await this.consent.has(dto.patientId, ConsentType.SHARE_INTAKE, doctorProfileId)) {
        const intakes = await this.intakeAnswers(doctor, dto.patientId, dto.appointmentId);
        if (intakes[0]) {
          context['intake'] = Object.entries(intakes[0].answers)
            .filter(([, v]) => v)
            .map(([k, v]) => `${k}: ${String(v)}`)
            .join('\n')
            .slice(0, 6000);
        }
      }
      if (dto.task === DoctorAssistTask.SUMMARIZE_AUTHORIZED_CONVERSATION) {
        const summary = await this.aiChat.professionalSummary(dto.patientId, doctorProfileId);
        if (summary.summary) context['authorized_conversation_summary'] = summary.summary;
      }
      if (await this.consent.has(dto.patientId, ConsentType.SHARE_MOOD_SUMMARY, doctorProfileId)) {
        const m = await this.mood.summaryForDoctor(dto.patientId, 30);
        context['mood_last_30_days'] = `check-ins: ${m.checkIns}; average (1-5): ${m.overallAverage ?? 'n/a'}`;
      }
      if (dto.task === DoctorAssistTask.SUMMARIZE_INTAKE && !context['intake']) {
        throw new ForbiddenException({ code: 'NO_SHARED_INTAKE', message: 'No intake has been shared with you for this patient.' });
      }
    }
    let res;
    try {
      res = await this.ai.doctorAssist({
        task: dto.task,
        professionalCategory: profile?.professionalCategory ?? 'OTHER',
        instructions: dto.instructions,
        context,
      });
    } catch (err) {
      if (err instanceof AiServiceUnavailableError) {
        throw new ForbiddenException({ code: 'AI_UNAVAILABLE', message: 'AI drafting is temporarily unavailable.' });
      }
      throw err;
    }
    const draft = await this.drafts.create({
      doctorProfileId: new Types.ObjectId(doctorProfileId),
      patientId: dto.patientId ? new Types.ObjectId(dto.patientId) : undefined,
      task: dto.task,
      draftEnc: this.crypto.encrypt(res.draft),
      provider: res.meta.provider,
      model: res.meta.model,
      isMock: res.meta.is_mock,
    });
    await this.interactions.create({
      userId: new Types.ObjectId(doctor.id),
      kind: 'doctor_assist',
      provider: res.meta.provider,
      model: res.meta.model,
      promptVersion: res.meta.prompt_version,
      policyVersion: res.meta.policy_version,
      inputTokens: res.meta.input_tokens,
      outputTokens: res.meta.output_tokens,
      latencyMs: res.meta.latency_ms,
      isMock: res.meta.is_mock,
      fallbackUsed: res.meta.fallback_used,
      guardActions: res.meta.output_guard_actions,
    });
    await this.audit.record({
      actorId: doctor.id, actorRole: doctor.role, action: 'ai.doctor_assist', resourceType: 'AiDraft', resourceId: draft._id.toString(),
      metadata: { task: dto.task, patientId: dto.patientId, contextKeys: Object.keys(context) },
    });
    return {
      draftId: draft._id.toString(),
      draft: res.draft,
      label: res.label,
      warnings: res.warnings,
      isMock: res.meta.is_mock,
      usedContext: Object.keys(context),
    };
  }
}
