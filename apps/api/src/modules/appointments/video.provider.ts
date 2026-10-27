import { Injectable, NotImplementedException } from '@nestjs/common';
import { AppConfigService } from '../../config/app-config.service.js';

export interface VideoAccess {
  provider: string;
  joinUrl: string;
  expiresAt: string;
}

/**
 * Video consultations are behind a provider interface and OFF by default (VIDEO_PROVIDER=none).
 * A real provider must issue authenticated, short-lived, per-participant access; public room
 * links are not acceptable. The `jitsi` option is a placeholder for a self-hosted Jitsi with
 * JWT authentication and is not wired up in v1.
 */
@Injectable()
export class VideoProvider {
  constructor(private readonly config: AppConfigService) {}

  get enabled(): boolean {
    return this.config.get('VIDEO_PROVIDER') !== 'none';
  }

  createAccess(_appointmentId: string, _participantId: string, _endsAt: Date): VideoAccess {
    if (!this.enabled) {
      throw new NotImplementedException({
        code: 'VIDEO_NOT_ENABLED',
        message: 'Video consultations are not enabled yet. Your professional will share how to join.',
      });
    }
    // Pending: JWT-authenticated Jitsi (or another provider) integration. Refuse rather than
    // fall back to a guessable public room.
    throw new NotImplementedException({
      code: 'VIDEO_PROVIDER_PENDING',
      message: 'The configured video provider is not implemented yet.',
    });
  }
}
