import { BadRequestException, Injectable, NotFoundException, PayloadTooLargeException } from '@nestjs/common';
import { fileTypeFromBuffer } from 'file-type';
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { AppConfigService } from '../../config/app-config.service.js';
import { hmacSha256, safeEqual } from '../../common/crypto/tokens.js';

export const ALLOWED_DOCUMENT_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/png': 'png',
  'image/jpeg': 'jpg',
};
export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;
const SIGNED_URL_TTL_SECONDS = 300;

export interface StoredFile {
  storageKey: string;
  mimeType: string;
  size: number;
}

/**
 * Private document storage on local disk (development / single node). Files live outside any
 * static web root under random names and are only served through short-lived HMAC-signed URLs.
 * The interface is small so an S3/GCS adapter with server-side encryption can replace it.
 */
@Injectable()
export class StorageService {
  private readonly root: string;

  constructor(private readonly config: AppConfigService) {
    this.root = resolve(config.get('UPLOAD_DIR'));
  }

  /** Validates by magic bytes (not the client-declared type or extension). */
  async savePrivateDocument(buffer: Buffer): Promise<StoredFile> {
    if (buffer.length > MAX_DOCUMENT_BYTES) {
      throw new PayloadTooLargeException({ code: 'FILE_TOO_LARGE', message: 'Files must be 5 MB or smaller.' });
    }
    const detected = await fileTypeFromBuffer(buffer);
    const ext = detected ? ALLOWED_DOCUMENT_TYPES[detected.mime] : undefined;
    if (!detected || !ext) {
      throw new BadRequestException({ code: 'UNSUPPORTED_FILE', message: 'Upload a PDF, PNG or JPEG file.' });
    }
    await mkdir(join(this.root, 'documents'), { recursive: true, mode: 0o700 });
    const storageKey = `documents/${randomBytes(16).toString('hex')}.${ext}`;
    await writeFile(join(this.root, storageKey), buffer, { mode: 0o600 });
    return { storageKey, mimeType: detected.mime, size: buffer.length };
  }

  async read(storageKey: string): Promise<Buffer> {
    if (!/^documents\/[a-f0-9]{32}\.(pdf|png|jpg)$/.test(storageKey)) throw new NotFoundException();
    return readFile(join(this.root, storageKey));
  }

  async remove(storageKey: string): Promise<void> {
    if (!/^documents\/[a-f0-9]{32}\.(pdf|png|jpg)$/.test(storageKey)) return;
    await unlink(join(this.root, storageKey)).catch(() => undefined);
  }

  /** Signed, short-lived download path bound to one file and one viewer. */
  signDownload(fileRef: string, viewerId: string): { url: string; expiresAt: string } {
    const exp = Math.floor(Date.now() / 1000) + SIGNED_URL_TTL_SECONDS;
    const sig = hmacSha256(this.config.get('FILE_SIGNING_SECRET'), `${fileRef}.${viewerId}.${exp}`);
    return {
      url: `/api/v1/files/${encodeURIComponent(fileRef)}?exp=${exp}&sig=${sig}`,
      expiresAt: new Date(exp * 1000).toISOString(),
    };
  }

  verifySignature(fileRef: string, viewerId: string, exp: number, sig: string): boolean {
    if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;
    const expected = hmacSha256(this.config.get('FILE_SIGNING_SECRET'), `${fileRef}.${viewerId}.${exp}`);
    return safeEqual(expected, sig);
  }
}
