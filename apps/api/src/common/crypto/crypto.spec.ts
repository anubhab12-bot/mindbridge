import { describe, expect, it } from 'vitest';
import { fakeConfig } from '../../../test/helpers/fakes.js';
import { FieldEncryptionService } from './field-encryption.service.js';
import { generateOpaqueToken, hmacSha256, safeEqual, sha256 } from './tokens.js';

describe('FieldEncryptionService', () => {
  const svc = new FieldEncryptionService(fakeConfig());

  it('round-trips text and never stores plaintext', () => {
    const enc = svc.encrypt('I felt anxious before my exam');
    expect(enc.startsWith('enc:v1:')).toBe(true);
    expect(enc).not.toContain('anxious');
    expect(svc.decrypt(enc)).toBe('I felt anxious before my exam');
  });

  it('uses a fresh IV for every encryption', () => {
    expect(svc.encrypt('same')).not.toBe(svc.encrypt('same'));
  });

  it('rejects tampered ciphertext', () => {
    const enc = svc.encrypt('secret');
    const raw = Buffer.from(enc.slice(7), 'base64');
    raw[raw.length - 1] ^= 0xff;
    expect(() => svc.decrypt('enc:v1:' + raw.toString('base64'))).toThrow();
  });

  it('rejects data encrypted with another key', () => {
    const other = new FieldEncryptionService(fakeConfig({ FIELD_ENCRYPTION_KEY: Buffer.alloc(32, 9).toString('base64') }));
    expect(() => svc.decrypt(other.encrypt('x'))).toThrow();
  });

  it('handles optional values', () => {
    expect(svc.encryptOptional(undefined)).toBeUndefined();
    expect(svc.decryptOptional(svc.encryptOptional('a'))).toBe('a');
  });
});

describe('token helpers', () => {
  it('generates unique url-safe tokens', () => {
    const a = generateOpaqueToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(a).not.toBe(generateOpaqueToken());
  });

  it('hashes deterministically', () => {
    expect(sha256('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(hmacSha256('k', 'v')).toBe(hmacSha256('k', 'v'));
    expect(hmacSha256('k', 'v')).not.toBe(hmacSha256('k2', 'v'));
  });

  it('compares in constant time and handles length mismatch', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abd')).toBe(false);
    expect(safeEqual('abc', 'abcd')).toBe(false);
  });
});
