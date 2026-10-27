import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { type Model, Types } from 'mongoose';
import { AppConfigService } from '../../config/app-config.service.js';
import { generateOpaqueToken, sha256 } from '../../common/crypto/tokens.js';
import { RefreshSession, type RefreshSessionDocument } from './schemas/refresh-session.schema.js';

export type RotateResult =
  | { kind: 'ok'; session: RefreshSessionDocument; refreshToken: string }
  | { kind: 'reuse'; userId: string; sessionId: string }
  | { kind: 'invalid' };

@Injectable()
export class SessionService {
  constructor(
    @InjectModel(RefreshSession.name) private readonly sessions: Model<RefreshSession>,
    private readonly config: AppConfigService,
  ) {}

  private expiry(): Date {
    return new Date(Date.now() + this.config.get('REFRESH_TOKEN_TTL_DAYS') * 24 * 3600 * 1000);
  }

  async create(userId: string, meta: { userAgent?: string; ip?: string }) {
    const refreshToken = generateOpaqueToken();
    const session = await this.sessions.create({
      userId: new Types.ObjectId(userId),
      tokenHash: sha256(refreshToken),
      expiresAt: this.expiry(),
      userAgent: meta.userAgent?.slice(0, 200),
      ipHash: meta.ip ? sha256(meta.ip).slice(0, 32) : undefined,
      lastUsedAt: new Date(),
    });
    return { session, refreshToken };
  }

  /**
   * Rotates a refresh token. Presenting a token that was already rotated away is treated as
   * theft: the whole session is revoked, forcing the legitimate user to sign in again.
   */
  async rotate(refreshToken: string): Promise<RotateResult> {
    const hash = sha256(refreshToken);
    const now = new Date();
    const newToken = generateOpaqueToken();
    const newHash = sha256(newToken);
    // Atomic compare-and-swap so two concurrent refreshes cannot both succeed.
    const session = await this.sessions.findOneAndUpdate(
      { tokenHash: hash, revokedAt: null, expiresAt: { $gt: now } },
      {
        $set: { tokenHash: newHash, lastUsedAt: now },
        $push: { previousTokenHashes: { $each: [hash], $slice: -20 } },
      },
      { new: true },
    );
    if (session) return { kind: 'ok', session, refreshToken: newToken };

    const reused = await this.sessions.findOne({ previousTokenHashes: hash }).select('+previousTokenHashes');
    if (reused) {
      await this.revoke(reused._id.toString(), 'refresh_token_reuse');
      return { kind: 'reuse', userId: reused.userId.toString(), sessionId: reused._id.toString() };
    }
    return { kind: 'invalid' };
  }

  async findActiveById(sessionId: string) {
    if (!Types.ObjectId.isValid(sessionId)) return null;
    return this.sessions
      .findOne({ _id: sessionId, revokedAt: null, expiresAt: { $gt: new Date() } })
      .select('_id userId')
      .lean();
  }

  async findByToken(refreshToken: string) {
    return this.sessions.findOne({ tokenHash: sha256(refreshToken) }).lean();
  }

  async revoke(sessionId: string, reason: string, userId?: string) {
    const filter: Record<string, unknown> = { _id: new Types.ObjectId(sessionId), revokedAt: null };
    if (userId) filter['userId'] = new Types.ObjectId(userId);
    const res = await this.sessions.updateOne(filter, { $set: { revokedAt: new Date(), revokedReason: reason } });
    return res.modifiedCount > 0;
  }

  async revokeAllForUser(userId: string, reason: string, exceptSessionId?: string) {
    const filter: Record<string, unknown> = { userId: new Types.ObjectId(userId), revokedAt: null };
    if (exceptSessionId) filter['_id'] = { $ne: new Types.ObjectId(exceptSessionId) };
    await this.sessions.updateMany(filter, { $set: { revokedAt: new Date(), revokedReason: reason } });
  }

  async listActive(userId: string) {
    return this.sessions
      .find({ userId: new Types.ObjectId(userId), revokedAt: null, expiresAt: { $gt: new Date() } })
      .select('_id userAgent createdAt lastUsedAt expiresAt')
      .sort({ lastUsedAt: -1 })
      .lean();
  }
}
