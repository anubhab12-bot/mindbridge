import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { AccountStatus, AdminPermission, DoctorRejectionReason, DoctorVerificationStatus, Role } from '@mindbridge/shared-types';
import { type Model, Types } from 'mongoose';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user.js';
import { AuditService } from '../audit/audit.service.js';
import { DoctorProfile } from '../doctors/schemas/doctor-profile.schema.js';
import { StorageService } from '../files/storage.service.js';
import { MailService } from '../mail/mail.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { User } from '../users/schemas/user.schema.js';
import { FieldEncryptionService } from '../../common/crypto/field-encryption.service.js';
import { verifyTotp } from '../auth/totp.js';
import type { ApproveDoctorVerificationDto, RejectDoctorVerificationDto } from './dto/verification.dto.js';
import {
  ProfessionalVerification,
  type VerificationDocumentType,
} from './schemas/professional-verification.schema.js';

const MAX_DOCUMENTS = 10;

/** Allowed admin transitions. Anything else is rejected. */
const TRANSITIONS: Record<string, DoctorVerificationStatus[]> = {
  approve: [DoctorVerificationStatus.PENDING_VERIFICATION, DoctorVerificationStatus.INFO_REQUESTED, DoctorVerificationStatus.REJECTED],
  reject: [DoctorVerificationStatus.PENDING_VERIFICATION, DoctorVerificationStatus.INFO_REQUESTED],
  requestInfo: [DoctorVerificationStatus.PENDING_VERIFICATION],
  suspend: [DoctorVerificationStatus.APPROVED],
  reactivate: [DoctorVerificationStatus.SUSPENDED, DoctorVerificationStatus.EXPIRED],
};

const STATUS_LABEL: Record<DoctorVerificationStatus, string> = {
  PENDING_VERIFICATION: 'Pending review',
  INFO_REQUESTED: 'More information requested',
  APPROVED: 'Approved',
  REJECTED: 'Not approved',
  SUSPENDED: 'Suspended',
  EXPIRED: 'Credentials expired',
};

@Injectable()
export class VerificationService {
  constructor(
    @InjectModel(ProfessionalVerification.name) private readonly model: Model<ProfessionalVerification>,
    @InjectModel(DoctorProfile.name) private readonly doctors: Model<DoctorProfile>,
    @InjectModel(User.name) private readonly users: Model<User>,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
    private readonly mail: MailService,
    private readonly notifications: NotificationsService,
    private readonly crypto?: FieldEncryptionService,
  ) {}

  async openApplication(doctorProfileId: string, userId: string) {
    await this.model.create({
      doctorProfileId: new Types.ObjectId(doctorProfileId),
      userId: new Types.ObjectId(userId),
      status: DoctorVerificationStatus.PENDING_VERIFICATION,
      submittedAt: new Date(),
      history: [{ status: DoctorVerificationStatus.PENDING_VERIFICATION, at: new Date(), actorId: new Types.ObjectId(userId) }],
    });
  }

  // --------------------------------------------------------------- doctor side

  async getMine(userId: string) {
    const app = await this.model.findOne({ userId: new Types.ObjectId(userId) }).lean();
    if (!app) throw new NotFoundException({ code: 'NOT_FOUND', message: 'No verification application found.' });
    return this.toView(app, userId, false);
  }

  async addDocument(user: AuthenticatedUser, type: VerificationDocumentType, file: { buffer: Buffer; originalname: string }) {
    const app = await this.model.findOne({ userId: new Types.ObjectId(user.id) });
    if (!app) throw new NotFoundException({ code: 'NOT_FOUND', message: 'No verification application found.' });
    if (app.documents.length >= MAX_DOCUMENTS) {
      throw new BadRequestException({ code: 'TOO_MANY_FILES', message: `You can upload up to ${MAX_DOCUMENTS} documents.` });
    }
    if (app.status === DoctorVerificationStatus.SUSPENDED) {
      throw new ConflictException({ code: 'ACCOUNT_SUSPENDED', message: 'Please contact support about your account.' });
    }
    const stored = await this.storage.savePrivateDocument(file.buffer);
    const safeName = file.originalname.replace(/[^\w.\- ]+/g, '_').slice(0, 120) || 'document';
    app.documents.push({ type, originalName: safeName, ...stored });
    // Uploading after an information request sends the application back to the review queue.
    if (app.status === DoctorVerificationStatus.INFO_REQUESTED) {
      app.status = DoctorVerificationStatus.PENDING_VERIFICATION;
      app.history.push({ status: app.status, at: new Date(), actorId: new Types.ObjectId(user.id), reason: 'Documents updated' });
      await this.doctors.updateOne({ _id: app.doctorProfileId }, { $set: { verificationStatus: app.status } });
    }
    await app.save();
    await this.audit.record({
      actorId: user.id,
      actorRole: user.role,
      action: 'verification.document_uploaded',
      resourceType: 'ProfessionalVerification',
      resourceId: app._id.toString(),
      metadata: { type, size: stored.size, mimeType: stored.mimeType },
    });
    return this.toView(app.toObject(), user.id, false);
  }

  async removeDocument(user: AuthenticatedUser, documentId: string) {
    const app = await this.model.findOne({ userId: new Types.ObjectId(user.id) });
    const doc = app?.documents.id(documentId);
    if (!app || !doc) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Document not found.' });
    if (app.status === DoctorVerificationStatus.APPROVED) {
      throw new ConflictException({ code: 'LOCKED', message: 'Documents of an approved application cannot be removed.' });
    }
    await this.storage.remove(doc.storageKey);
    doc.deleteOne();
    await app.save();
    await this.audit.record({ actorId: user.id, action: 'verification.document_removed', resourceType: 'ProfessionalVerification', resourceId: app._id.toString() });
  }

  // --------------------------------------------------------------- admin side

  async listForReview(status: DoctorVerificationStatus | undefined, skip: number, limit: number) {
    // Automatically sweep expired credentials
    await this.checkAndExpireCredentials().catch(() => 0);

    const filter = status
      ? { status }
      : { status: { $in: [DoctorVerificationStatus.PENDING_VERIFICATION, DoctorVerificationStatus.INFO_REQUESTED] } };

    const [apps, total] = await Promise.all([
      this.model.find(filter).sort({ createdAt: 1 }).skip(skip).limit(limit).lean(),
      this.model.countDocuments(filter),
    ]);
    const profiles = await this.doctors
      .find({ _id: { $in: apps.map((a) => a.doctorProfileId) } })
      .select('displayName professionalCategory registrationCouncil registrationNumber yearsExperience specialties verificationExpiresAt')
      .lean();
    const byId = new Map(profiles.map((p) => [p._id.toString(), p]));

    const now = Date.now();
    const items = apps.map((a) => {
      const submitted = a.submittedAt ? new Date(a.submittedAt).getTime() : new Date(a.createdAt).getTime();
      const ageHours = Math.max(0, Math.floor((now - submitted) / 3600_000));
      const slaBreached = ageHours > 48; // 48h SLA
      const doc = byId.get(a.doctorProfileId.toString());

      let riskScore = 10;
      if (a.documents.length === 0) riskScore += 40;
      if (!doc?.registrationCouncil || !doc?.registrationNumber) riskScore += 30;
      if (slaBreached) riskScore += 20;

      return {
        id: a._id.toString(),
        status: a.status,
        submittedAt: a.submittedAt ?? a.createdAt,
        ageHours,
        slaBreached,
        riskScore,
        documentCount: a.documents.length,
        doctor: doc,
      };
    });

    // Sort: SLA breached & highest risk first, then oldest
    items.sort((x, y) => {
      if (x.slaBreached !== y.slaBreached) return x.slaBreached ? -1 : 1;
      if (y.riskScore !== x.riskScore) return y.riskScore - x.riskScore;
      return y.ageHours - x.ageHours;
    });

    return { total, items };
  }

  async verifyReviewerTotp(adminId: string, code?: string): Promise<void> {
    const totpCode = (code || '').trim();
    if (!totpCode) {
      throw new UnauthorizedException({
        code: 'STEP_UP_TOTP_REQUIRED',
        message: 'Doctor approval requires a fresh 6-digit TOTP code for step-up verification.',
      });
    }
    const admin = await this.users.findById(adminId).select('+mfaSecretEnc mfaEnabled').lean();
    if (!admin || !admin.mfaEnabled || !admin.mfaSecretEnc) {
      throw new ForbiddenException({
        code: 'MFA_NOT_ENROLLED',
        message: 'Step-up verification requires two-factor authentication (TOTP) to be enabled on your account.',
      });
    }
    const secret = this.crypto ? this.crypto.decrypt(admin.mfaSecretEnc) : admin.mfaSecretEnc;
    if (!verifyTotp(secret, totpCode)) {
      throw new UnauthorizedException({
        code: 'STEP_UP_TOTP_INVALID',
        message: 'The TOTP verification code is invalid or expired.',
      });
    }
  }

  async checkAndExpireCredentials(): Promise<number> {
    const now = new Date();
    const expiredDoctors = await this.doctors.find({
      verificationStatus: DoctorVerificationStatus.APPROVED,
      verificationExpiresAt: { $lte: now },
    });

    for (const doc of expiredDoctors) {
      doc.verificationStatus = DoctorVerificationStatus.EXPIRED;
      await doc.save();

      await this.model.updateOne(
        { doctorProfileId: doc._id },
        {
          $set: { status: DoctorVerificationStatus.EXPIRED },
          $push: {
            history: {
              status: DoctorVerificationStatus.EXPIRED,
              reason: 'Credential validity period (12 months) has elapsed. Re-verification required.',
              at: now,
            },
          },
        },
      );

      await this.audit.record({
        actorId: 'system',
        actorRole: 'SYSTEM' as any,
        action: 'doctor.verification_expired',
        resourceType: 'DoctorProfile',
        resourceId: doc._id.toString(),
        metadata: {
          expiredAt: now,
          previousExpiryDate: doc.verificationExpiresAt,
        },
      });

      await this.notifications.notify(doc.userId, {
        type: 'verification.expired',
        title: 'Credentials Expired · Re-verification Required',
        body: 'Your verified clinician credentials have passed their validity cycle. Please submit updated registration documents for review.',
        link: '/doctor/verification-pending',
      });
    }

    return expiredDoctors.length;
  }

  async approveDoctor(
    id: string,
    admin: AuthenticatedUser,
    dto: ApproveDoctorVerificationDto,
    headerTotp?: string,
  ) {
    if (admin.role !== Role.ADMIN || !admin.adminPermissions.includes(AdminPermission.DOCTORS_VERIFY)) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'You do not have permission to verify doctors.' });
    }

    if (!dto.externalRegisterChecked) {
      throw new BadRequestException({
        code: 'EXTERNAL_REGISTER_REQUIRED',
        message: 'You must confirm that the external registration authority was verified.',
      });
    }

    if (!dto.externalRegisterReference?.trim() || dto.externalRegisterReference.trim().length < 5) {
      throw new BadRequestException({
        code: 'REFERENCE_REQUIRED',
        message: 'The external register URL or council lookup reference consulted is mandatory.',
      });
    }

    if (!dto.evidenceNote?.trim() || dto.evidenceNote.trim().length < 5) {
      throw new BadRequestException({
        code: 'EVIDENCE_NOTE_REQUIRED',
        message: 'A free-text evidence note detailing your verification findings is mandatory.',
      });
    }

    const totp = headerTotp || dto.totpCode;
    await this.verifyReviewerTotp(admin.id, totp);

    const app = await this.model.findById(id);
    if (!app) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Verification application not found.' });

    if (app.status === DoctorVerificationStatus.APPROVED) {
      throw new ConflictException({ code: 'ALREADY_APPROVED', message: 'This professional is already verified.' });
    }

    if (app.documents.length === 0) {
      throw new ConflictException({ code: 'NO_DOCUMENTS', message: 'An application needs at least one document before approval.' });
    }

    const now = new Date();
    // 12-month re-verification cycle
    const verificationExpiresAt = new Date(now.getTime() + 365 * 86_400_000);
    const adminObjectId = new Types.ObjectId(admin.id);

    app.status = DoctorVerificationStatus.APPROVED;
    app.decidedAt = now;
    app.decidedBy = adminObjectId;
    app.externalRegisterChecked = true;
    app.externalRegisterCheckedAt = now;
    app.externalRegisterReference = dto.externalRegisterReference.trim();
    app.evidenceNote = dto.evidenceNote.trim();
    app.verificationExpiresAt = verificationExpiresAt;
    app.history.push({
      status: DoctorVerificationStatus.APPROVED,
      reason: `Verified via ${dto.externalRegisterReference.trim()}: ${dto.evidenceNote.trim()}`,
      actorId: adminObjectId,
      at: now,
    });
    await app.save();

    const doctorProfile = await this.doctors.findByIdAndUpdate(
      app.doctorProfileId,
      {
        $set: {
          verificationStatus: DoctorVerificationStatus.APPROVED,
          verifiedAt: now,
          verifiedBy: adminObjectId,
          externalRegisterChecked: true,
          externalRegisterCheckedAt: now,
          externalRegisterReference: dto.externalRegisterReference.trim(),
          verificationEvidenceNote: dto.evidenceNote.trim(),
          verificationExpiresAt,
          rejectionReasonCode: null,
          rejectionNote: null,
        },
      },
      { new: true },
    );

    await this.audit.record({
      actorId: admin.id,
      actorRole: admin.role,
      action: 'doctor.verification_approved',
      resourceType: 'ProfessionalVerification',
      resourceId: id,
      metadata: {
        doctorId: app.doctorProfileId.toString(),
        registrationCouncil: doctorProfile?.registrationCouncil,
        registrationNumber: doctorProfile?.registrationNumber,
        reference: dto.externalRegisterReference.trim(),
        evidenceNote: dto.evidenceNote.trim(),
        verificationExpiresAt,
      },
    });

    await this.notifications.notify(app.userId, {
      type: 'verification.approved',
      title: 'Verification Approved',
      body: 'Your professional credentials have been verified. You can now accept appointments.',
      link: '/doctor/dashboard',
    });

    return {
      success: true,
      id,
      status: DoctorVerificationStatus.APPROVED,
      verifiedAt: now,
      verificationExpiresAt,
    };
  }

  async rejectDoctor(
    id: string,
    admin: AuthenticatedUser,
    dto: RejectDoctorVerificationDto,
  ) {
    if (admin.role !== Role.ADMIN || !admin.adminPermissions.includes(AdminPermission.DOCTORS_VERIFY)) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'You do not have permission to verify doctors.' });
    }

    if (!dto.reasonCode || !Object.values(DoctorRejectionReason).includes(dto.reasonCode)) {
      throw new BadRequestException({ code: 'INVALID_REASON_CODE', message: 'Please select a valid rejection reason code.' });
    }

    if (!dto.rejectionNote?.trim() || dto.rejectionNote.trim().length < 5) {
      throw new BadRequestException({ code: 'REJECTION_NOTE_REQUIRED', message: 'A rejection explanation for the applicant is required.' });
    }

    const app = await this.model.findById(id);
    if (!app) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Verification application not found.' });

    const now = new Date();
    const adminObjectId = new Types.ObjectId(admin.id);

    app.status = DoctorVerificationStatus.REJECTED;
    app.decidedAt = now;
    app.decidedBy = adminObjectId;
    app.rejectionReasonCode = dto.reasonCode;
    app.rejectionNote = dto.rejectionNote.trim();
    app.history.push({
      status: DoctorVerificationStatus.REJECTED,
      reason: `[${dto.reasonCode}] ${dto.rejectionNote.trim()}`,
      actorId: adminObjectId,
      at: now,
    });
    await app.save();

    await this.doctors.updateOne(
      { _id: app.doctorProfileId },
      {
        $set: {
          verificationStatus: DoctorVerificationStatus.REJECTED,
          rejectionReasonCode: dto.reasonCode,
          rejectionNote: dto.rejectionNote.trim(),
        },
      },
    );

    await this.audit.record({
      actorId: admin.id,
      actorRole: admin.role,
      action: 'doctor.verification_rejected',
      resourceType: 'ProfessionalVerification',
      resourceId: id,
      metadata: {
        doctorId: app.doctorProfileId.toString(),
        reasonCode: dto.reasonCode,
        rejectionNote: dto.rejectionNote.trim(),
      },
    });

    await this.notifications.notify(app.userId, {
      type: 'verification.rejected',
      title: 'Verification Update',
      body: `Your verification was not approved: ${dto.rejectionNote.trim()}`,
      link: '/doctor/verification-pending',
    });

    return {
      success: true,
      id,
      status: DoctorVerificationStatus.REJECTED,
      reasonCode: dto.reasonCode,
      rejectionNote: dto.rejectionNote.trim(),
    };
  }

  async getForAdmin(id: string, admin: AuthenticatedUser) {
    const app = await this.model.findById(id).lean();
    if (!app) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Application not found.' });
    const [profile, user] = await Promise.all([
      this.doctors.findById(app.doctorProfileId).lean(),
      this.users.findById(app.userId).select('email emailVerifiedAt status createdAt').lean(),
    ]);
    await this.audit.record({
      actorId: admin.id,
      actorRole: admin.role,
      action: 'verification.viewed',
      resourceType: 'ProfessionalVerification',
      resourceId: id,
    });
    return { ...this.toView(app, admin.id, true), doctor: profile, account: user };
  }

  async decide(
    id: string,
    action: 'approve' | 'reject' | 'requestInfo' | 'suspend' | 'reactivate',
    admin: AuthenticatedUser,
    reason: string | undefined,
  ) {
    if (admin.role !== Role.ADMIN || !admin.adminPermissions.includes(AdminPermission.DOCTORS_VERIFY)) {
      // Guards already enforce this; repeated here because it is the only path that changes verification status.
      throw new NotFoundException();
    }
    if ((action === 'reject' || action === 'requestInfo' || action === 'suspend') && !reason?.trim()) {
      throw new BadRequestException({ code: 'REASON_REQUIRED', message: 'Please record a reason.' });
    }
    const app = await this.model.findById(id);
    if (!app) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Application not found.' });
    const allowed = TRANSITIONS[action]!;
    if (!allowed.includes(app.status)) {
      throw new ConflictException({
        code: 'INVALID_TRANSITION',
        message: `Cannot ${action} an application that is ${app.status}.`,
      });
    }
    const next: Record<typeof action, DoctorVerificationStatus> = {
      approve: DoctorVerificationStatus.APPROVED,
      reject: DoctorVerificationStatus.REJECTED,
      requestInfo: DoctorVerificationStatus.INFO_REQUESTED,
      suspend: DoctorVerificationStatus.SUSPENDED,
      reactivate: DoctorVerificationStatus.APPROVED,
    };
    const status = next[action];
    if (status === DoctorVerificationStatus.APPROVED && app.documents.length === 0) {
      throw new ConflictException({ code: 'NO_DOCUMENTS', message: 'An application needs at least one document before approval.' });
    }
    const now = new Date();
    const adminObjectId = new Types.ObjectId(admin.id);
    app.status = status;
    app.history.push({ status, reason: reason?.trim(), actorId: adminObjectId, at: now });
    app.requestedInfo = action === 'requestInfo' ? reason?.trim() : undefined;
    app.decidedAt = now;
    app.decidedBy = adminObjectId;
    await app.save();

    const profileUpdate: Record<string, unknown> = { verificationStatus: status };
    if (status === DoctorVerificationStatus.APPROVED) {
      profileUpdate['verifiedAt'] = now;
      profileUpdate['verifiedBy'] = adminObjectId;
    }
    await this.doctors.updateOne({ _id: app.doctorProfileId }, { $set: profileUpdate });

    await this.audit.record({
      actorId: admin.id,
      actorRole: admin.role,
      action: `verification.${action}`,
      resourceType: 'ProfessionalVerification',
      resourceId: id,
      metadata: { status, hasReason: !!reason },
    });

    const user = await this.users.findById(app.userId).select('email displayName status').lean();
    if (user && user.status !== AccountStatus.DELETED) {
      const message =
        action === 'requestInfo' || action === 'reject' || action === 'suspend' ? (reason ?? '') : 'No further action is needed.';
      await this.notifications.notify(app.userId, {
        type: 'verification.updated',
        title: `Verification: ${STATUS_LABEL[status]}`,
        body: message.slice(0, 500),
        link: '/doctor/verification-pending',
      });
      await this.mail.send(user.email, 'doctor-verification-update', {
        name: user.displayName,
        status: STATUS_LABEL[status],
        message,
      });
    }
    return this.toView(app.toObject(), admin.id, true);
  }

  // --------------------------------------------------------------- files

  /** Resolves a signed document reference for a viewer, enforcing owner-or-verifier access. */
  async resolveDocument(applicationId: string, documentId: string, viewer: AuthenticatedUser) {
    if (!Types.ObjectId.isValid(applicationId) || !Types.ObjectId.isValid(documentId)) throw new NotFoundException();
    const app = await this.model.findById(applicationId).lean();
    const doc = app?.documents.find((d) => d._id.toString() === documentId);
    if (!app || !doc) throw new NotFoundException();
    const isOwner = app.userId.toString() === viewer.id;
    const isVerifier = viewer.role === Role.ADMIN && viewer.adminPermissions.includes(AdminPermission.DOCTORS_VERIFY);
    if (!isOwner && !isVerifier) throw new NotFoundException();
    await this.audit.record({
      actorId: viewer.id,
      actorRole: viewer.role,
      action: 'verification.document_downloaded',
      resourceType: 'ProfessionalVerification',
      resourceId: applicationId,
    });
    return { buffer: await this.storage.read(doc.storageKey), mimeType: doc.mimeType, name: doc.originalName };
  }

  async countsByStatus() {
    return this.model.aggregate<{ _id: string; count: number }>([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
  }

  private toView(app: ProfessionalVerification & { _id: Types.ObjectId }, viewerId: string, includeActors: boolean) {
    return {
      id: app._id.toString(),
      status: app.status,
      requestedInfo: app.requestedInfo,
      submittedAt: app.submittedAt,
      decidedAt: app.decidedAt,
      documents: app.documents.map((d) => ({
        id: d._id.toString(),
        type: d.type,
        originalName: d.originalName,
        mimeType: d.mimeType,
        size: d.size,
        uploadedAt: d.uploadedAt,
        download: this.storage.signDownload(`verification.${app._id.toString()}.${d._id.toString()}`, viewerId),
      })),
      history: app.history.map((h) => ({
        status: h.status,
        reason: h.reason,
        at: h.at,
        ...(includeActors ? { actorId: h.actorId?.toString() } : {}),
      })),
    };
  }
}
