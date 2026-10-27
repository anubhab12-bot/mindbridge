import { Injectable } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { AppConfigService } from '../../config/app-config.service.js';

const PREFIX = 'enc:v1:';

/**
 * Application-level AES-256-GCM encryption for the most sensitive free-text fields
 * (journals, AI conversations, clinical notes, secure messages, intake answers).
 * This is in addition to disk/volume encryption at rest, so a database dump or a
 * misconfigured backup does not expose readable patient content.
 */
@Injectable()
export class FieldEncryptionService {
  private readonly key: Buffer;

  constructor(config: AppConfigService) {
    this.key = Buffer.from(config.get('FIELD_ENCRYPTION_KEY'), 'base64');
  }

  encrypt(plain: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return PREFIX + Buffer.concat([iv, tag, data]).toString('base64');
  }

  decrypt(value: string): string {
    if (!value.startsWith(PREFIX)) {
      throw new Error('Value is not encrypted with a supported scheme');
    }
    const raw = Buffer.from(value.slice(PREFIX.length), 'base64');
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const data = raw.subarray(28);
    const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  }

  encryptOptional(plain: string | undefined | null): string | undefined {
    return plain === undefined || plain === null || plain === '' ? undefined : this.encrypt(plain);
  }

  decryptOptional(value: string | undefined | null): string | undefined {
    return value ? this.decrypt(value) : undefined;
  }
}
