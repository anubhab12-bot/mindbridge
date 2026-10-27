import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { AccountStatus, AdminPermission, DoctorVerificationStatus, Role } from '@mindbridge/shared-types';
import { type Model, Types } from 'mongoose';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user.js';
import { AuditService } from '../audit/audit.service.js';
import { DoctorProfile } from '../doctors/schemas/doctor-profile.schema.js';
import { StorageService } from '../files/storage.service.js';
import { MailService } from '../mail/mail.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { User } from '../users/schemas/user.schema.js';
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
  reactivate: [DoctorVerificationStatus.SUSPENDED],
};

const STATUS_LABEL: Record<DoctorVerificationStatus, string> = {
  PENDING_VERIFICATION: 'Pending review',
  INFO_REQUESTED: 'More information requested',
  APPROVED: 'Approved',
  REJECTED: 'Not approved',
  SUSPENDED: 'Suspended',
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
    const filter = status
      ? { status }
      : { status: { $in: [DoctorVerificationStatus.PENDING_VERIFICATION, DoctorVerificationStatus.INFO_REQUESTED] } };
    const [apps, total] = await Promise.all([
      this.model.find(filter).sort({ createdAt: 1 }).skip(skip).limit(limit).lean(),
      this.model.countDocuments(filter),
    ]);
    const profiles = await this.doctors
      .find({ _id: { $in: apps.map((a) => a.doctorProfileId) } })
      .select('displayName professionalCategory registrationCouncil registrationNumber yearsExperience')
      .lean();
    const byId = new Map(profiles.map((p) => [p._id.toString(), p]));
    return {
      total,
      items: apps.map((a) => ({
        id: a._id.toString(),
        status: a.status,
        submittedAt: a.submittedAt,
        documentCount: a.documents.length,
        doctor: byId.get(a.doctorProfileId.toString()),
      })),
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
