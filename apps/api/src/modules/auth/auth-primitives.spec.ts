import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { PasswordService } from './password.service.js';
import { generateTotpSecret, otpauthUrl, totpAt, verifyTotp } from './totp.js';

describe('TOTP (RFC 6238)', () => {
  // RFC 6238 Appendix B secret "12345678901234567890", truncated to 6 digits.
  const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

  it('matches the RFC test vectors', () => {
    expect(totpAt(secret, 59_000)).toBe('287082');
    expect(totpAt(secret, 1_111_111_109_000)).toBe('081804');
    expect(totpAt(secret, 1_234_567_890_000)).toBe('005924');
  });

  it('accepts the current code and one step of drift, rejects others', () => {
    const now = 1_700_000_000_000;
    expect(verifyTotp(secret, totpAt(secret, now), now)).toBe(true);
    expect(verifyTotp(secret, totpAt(secret, now - 30_000), now)).toBe(true);
    expect(verifyTotp(secret, totpAt(secret, now - 120_000), now)).toBe(false);
    expect(verifyTotp(secret, 'abcdef', now)).toBe(false);
  });

  it('generates base32 secrets and otpauth URLs', () => {
    expect(generateTotpSecret()).toMatch(/^[A-Z2-7]{32,}$/);
    expect(otpauthUrl(secret, 'dr@example.org')).toContain('otpauth://totp/');
  });
});

describe('PasswordService', () => {
  const svc = new PasswordService();

  it('hashes with Argon2id and verifies', async () => {
    const hash = await svc.hash('Correct-Horse-9-Battery');
    expect(hash.startsWith('$argon2id$')).toBe(true);
    expect(await svc.verify(hash, 'Correct-Horse-9-Battery')).toBe(true);
    expect(await svc.verify(hash, 'wrong-password')).toBe(false);
  });

  it('returns false for a missing or malformed hash instead of throwing', async () => {
    expect(await svc.verify(undefined, 'x')).toBe(false);
    expect(await svc.verify('not-a-hash', 'x')).toBe(false);
  });

  it.each([
    ['short1!', 'too short'],
    ['password123', 'common'],
    ['lowercaseonly', 'not enough classes and under 16 chars'],
    ['Priya-Sharma-2026', 'contains name'],
  ])('rejects weak password %s (%s)', (pw) => {
    expect(() => svc.assertStrong(pw, 'priya@example.org', 'Priya Sharma')).toThrow(BadRequestException);
  });

  it('accepts a strong password and a long passphrase', () => {
    expect(() => svc.assertStrong('Tea-Garden-Rain-42')).not.toThrow();
    expect(() => svc.assertStrong('quiet morning walks by the river')).not.toThrow();
  });
});
