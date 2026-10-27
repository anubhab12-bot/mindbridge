import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { DoctorVerificationStatus } from '@mindbridge/shared-types';
import { type Model, Types } from 'mongoose';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user.js';
import { AuditService } from '../audit/audit.service.js';
import { CareRelationship, CareRelationshipStatus } from './schemas/care-relationship.schema.js';

/**
 * Central check for "may this professional see anything about this patient?".
 * Every doctor-side read of patient data must go through `assertDoctorCanAccess`.
 */
@Injectable()
export class CareService {
  constructor(
    @InjectModel(CareRelationship.name) private readonly model: Model<CareRelationship>,
    private readonly audit: AuditService,
  ) {}

  async establish(doctorProfileId: Types.ObjectId, patientId: Types.ObjectId) {
    await this.model.updateOne(
      { doctorProfileId, patientId },
      {
        $set: { status: CareRelationshipStatus.ACTIVE, establishedAt: new Date() },
        $unset: { endedAt: 1, endedBy: 1 },
      },
      { upsert: true },
    );
  }

  async isActive(doctorProfileId: string, patientId: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(doctorProfileId) || !Types.ObjectId.isValid(patientId)) return false;
    return !!(await this.model.exists({
      doctorProfileId: new Types.ObjectId(doctorProfileId),
      patientId: new Types.ObjectId(patientId),
      status: CareRelationshipStatus.ACTIVE,
    }));
  }

  /**
   * Throws 404 (not 403) when there is no active relationship so a doctor cannot probe which
   * patient ids exist. Also requires the professional to be currently APPROVED.
   */
  async assertDoctorCanAccess(doctor: AuthenticatedUser, patientId: string, purpose: string) {
    const ok =
      doctor.doctorStatus === DoctorVerificationStatus.APPROVED &&
      !!doctor.doctorProfileId &&
      (await this.isActive(doctor.doctorProfileId, patientId));
    await this.audit.record({
      actorId: doctor.id,
      actorRole: doctor.role,
      action: `care.access.${purpose}`,
      outcome: ok ? 'SUCCESS' : 'DENIED',
      resourceType: 'Patient',
      resourceId: patientId,
    });
    if (!ok) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Patient not found.' });
  }

  async listPatientIdsForDoctor(doctorProfileId: string) {
    const rows = await this.model
      .find({ doctorProfileId: new Types.ObjectId(doctorProfileId), status: CareRelationshipStatus.ACTIVE })
      .select('patientId establishedAt')
      .sort({ establishedAt: -1 })
      .lean();
    return rows;
  }

  async listForPatient(patientId: string) {
    return this.model.find({ patientId: new Types.ObjectId(patientId) }).sort({ updatedAt: -1 }).lean();
  }

  async endByPatient(patientId: string, doctorProfileId: string) {
    const res = await this.model.updateOne(
      {
        patientId: new Types.ObjectId(patientId),
        doctorProfileId: new Types.ObjectId(doctorProfileId),
        status: CareRelationshipStatus.ACTIVE,
      },
      { $set: { status: CareRelationshipStatus.ENDED, endedAt: new Date(), endedBy: 'PATIENT' } },
    );
    if (res.modifiedCount === 0) throw new NotFoundException({ code: 'NOT_FOUND', message: 'No active care relationship.' });
    await this.audit.record({ actorId: patientId, action: 'care.ended_by_patient', resourceType: 'DoctorProfile', resourceId: doctorProfileId });
  }

  async endAllForDoctor(doctorProfileId: string) {
    await this.model.updateMany(
      { doctorProfileId: new Types.ObjectId(doctorProfileId), status: CareRelationshipStatus.ACTIVE },
      { $set: { status: CareRelationshipStatus.ENDED, endedAt: new Date(), endedBy: 'SYSTEM' } },
    );
  }

  async endAllForPatient(patientId: string) {
    await this.model.updateMany(
      { patientId: new Types.ObjectId(patientId), status: CareRelationshipStatus.ACTIVE },
      { $set: { status: CareRelationshipStatus.ENDED, endedAt: new Date(), endedBy: 'SYSTEM' } },
    );
  }

  assertIsDoctor(user: AuthenticatedUser) {
    if (!user.doctorProfileId) throw new ForbiddenException();
    return user.doctorProfileId;
  }
}
