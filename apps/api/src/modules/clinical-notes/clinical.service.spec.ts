import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ClinicalNoteStatus, ClinicalNoteType, ConsentType, DoctorAssistTask, DoctorVerificationStatus, Role } from '@mindbridge/shared-types';
import { Types } from 'mongoose';
import { describe, expect, it, vi } from 'vitest';
import { fakeConfig, query } from '../../../test/helpers/fakes.js';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user.js';
import { FieldEncryptionService } from '../../common/crypto/field-encryption.service.js';
import { ClinicalService } from './clinical.service.js';

const crypto = new FieldEncryptionService(fakeConfig());
const PATIENT = new Types.ObjectId().toString();
const doctor = {
  id: new Types.ObjectId().toString(),
  role: Role.DOCTOR,
  doctorStatus: DoctorVerificationStatus.APPROVED,
  doctorProfileId: new Types.ObjectId().toString(),
} as AuthenticatedUser;

function setup(opts: { careActive?: boolean; consents?: ConsentType[] } = {}) {
  const care = {
    assertDoctorCanAccess: vi.fn(async () => {
      if (opts.careActive === false) throw new NotFoundException();
    }),
    assertIsDoctor: vi.fn(() => doctor.doctorProfileId),
  };
  const consent = { has: vi.fn(async (_p: string, t: ConsentType) => (opts.consents ?? []).includes(t)) };
  const noteDoc = {
    _id: new Types.ObjectId(),
    patientId: new Types.ObjectId(PATIENT),
    status: ClinicalNoteStatus.DRAFT as string,
    titleEnc: crypto.encrypt('t'),
    contentEnc: crypto.encrypt('c'),
    addenda: [] as unknown[],
    save: vi.fn(),
    deleteOne: vi.fn(),
    toObject() {
      const addenda = (this.addenda as Record<string, unknown>[]).map((a) => ({ _id: new Types.ObjectId(), createdAt: new Date(), ...a }));
      return { ...this, addenda, createdAt: new Date(), updatedAt: new Date() };
    },
  };
  const notes = {
    create: vi.fn(async (d: Record<string, unknown>) => {
      const _id = new Types.ObjectId();
      return { ...d, _id, toObject: () => ({ ...d, _id, addenda: [] }) };
    }),
    findOne: vi.fn(async () => noteDoc),
  };
  const ai = { doctorAssist: vi.fn() };
  const drafts = { create: vi.fn(async () => ({ _id: new Types.ObjectId() })), findOne: vi.fn(() => query(null)) };
  const svc = new ClinicalService(
    notes as never, drafts as never, { create: vi.fn() } as never, {} as never, {} as never,
    { exists: vi.fn().mockResolvedValue(true) } as never, { find: vi.fn(() => query([])) } as never,
    { findById: vi.fn(() => query({ professionalCategory: 'CLINICAL_PSYCHOLOGIST' })) } as never,
    care as never, consent as never, { summaryForDoctor: vi.fn() } as never, { professionalSummary: vi.fn() } as never,
    ai as never, crypto, { record: vi.fn() } as never,
  );
  return { svc, care, consent, notes, noteDoc, ai, drafts };
}

describe('ClinicalService authorization', () => {
  it('returns 404 without an active care relationship', async () => {
    const { svc } = setup({ careActive: false });
    await expect(svc.patientOverview(doctor, PATIENT)).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc.createNote(doctor, PATIENT, { type: ClinicalNoteType.CONSULTATION_NOTE, title: 't', content: 'c' })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('requires consent for shared mood data and intakes', async () => {
    const { svc } = setup({ consents: [] });
    await expect(svc.moodSummary(doctor, PATIENT)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc.sharedIntakes(doctor, PATIENT)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('requires DOCTOR_AI_ASSIST consent before using patient context', async () => {
    const { svc, ai } = setup({ consents: [ConsentType.SHARE_INTAKE] });
    await expect(svc.aiAssist(doctor, { task: DoctorAssistTask.SUMMARIZE_INTAKE, patientId: PATIENT })).rejects.toMatchObject({
      response: { code: 'CONSENT_REQUIRED' },
    });
    expect(ai.doctorAssist).not.toHaveBeenCalled();
  });

  it('returns AI output as a labelled draft and never writes a note', async () => {
    const { svc, ai, notes } = setup();
    ai.doctorAssist.mockResolvedValue({
      draft: 'Draft text', label: 'AI_DRAFT_REQUIRES_PROFESSIONAL_REVIEW', warnings: ['Review before use'],
      meta: { provider: 'mock', model: 'mock', is_mock: true, input_tokens: 0, output_tokens: 0, latency_ms: 1, fallback_used: false, output_guard_actions: [] },
    });
    const res = await svc.aiAssist(doctor, { task: DoctorAssistTask.PATIENT_EDUCATION, instructions: 'sleep hygiene' });
    expect(res.label).toBe('AI_DRAFT_REQUIRES_PROFESSIONAL_REVIEW');
    expect(res.isMock).toBe(true);
    expect(notes.create).not.toHaveBeenCalled();
  });

  it('encrypts note content', async () => {
    const { svc, notes } = setup();
    await svc.createNote(doctor, PATIENT, { type: ClinicalNoteType.CONSULTATION_NOTE, title: 'Session 1', content: 'Discussed sleep' });
    const doc = notes.create.mock.calls[0]![0] as Record<string, string>;
    expect(doc['contentEnc']).toMatch(/^enc:v1:/);
    expect(JSON.stringify(doc)).not.toContain('Discussed sleep');
  });

  it('final notes are immutable and cannot be deleted', async () => {
    const { svc, noteDoc } = setup();
    noteDoc.status = ClinicalNoteStatus.FINAL;
    await expect(svc.updateNote(doctor, noteDoc._id.toString(), { content: 'x' })).rejects.toBeInstanceOf(ConflictException);
    await expect(svc.deleteDraft(doctor, noteDoc._id.toString())).rejects.toBeInstanceOf(ConflictException);
    await svc.addAddendum(doctor, noteDoc._id.toString(), 'correction');
    expect(noteDoc.addenda).toHaveLength(1);
  });
});
