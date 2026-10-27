import { hash, verify } from '@node-rs/argon2';
import { BadRequestException, Injectable } from '@nestjs/common';

/** `Algorithm.Argon2id` from @node-rs/argon2 (a const enum, which isolatedModules cannot inline). */
const ARGON2ID = 2;

/** A short deny-list of very common passwords; length rules carry most of the strength. */
const COMMON_PASSWORDS = new Set([
  'password1234',
  'passwordpassword',
  '123456789012',
  'qwertyuiop12',
  'iloveyou1234',
  'mindbridge123',
  'welcome12345',
  'letmein12345',
  'adminadmin12',
  'changeme1234',
]);

/**
 * Argon2id with OWASP-recommended parameters (19 MiB memory, 2 iterations, 1 lane).
 * A dummy hash is verified for unknown accounts so login timing does not reveal
 * whether an email is registered.
 */
@Injectable()
export class PasswordService {
  private readonly options = { algorithm: ARGON2ID, memoryCost: 19456, timeCost: 2, parallelism: 1 };
  private dummyHash?: Promise<string>;

  hash(password: string): Promise<string> {
    return hash(password, this.options);
  }

  async verify(passwordHash: string | undefined, password: string): Promise<boolean> {
    if (!passwordHash) {
      this.dummyHash ??= hash('dummy-password-for-timing', this.options);
      await verify(await this.dummyHash, password).catch(() => false);
      return false;
    }
    try {
      return await verify(passwordHash, password);
    } catch {
      return false;
    }
  }

  /** Server-side strength policy (the client mirrors it for UX only). */
  assertStrong(password: string, email?: string, name?: string): void {
    const problems: string[] = [];
    if (password.length < 10) problems.push('Use at least 10 characters.');
    if (password.length > 128) problems.push('Use at most 128 characters.');
    const lower = password.toLowerCase();
    if (COMMON_PASSWORDS.has(lower)) problems.push('This password is too common.');
    const local = email?.split('@')[0]?.toLowerCase();
    if (local && local.length >= 4 && lower.includes(local)) problems.push('Do not include your email in your password.');
    if (name && name.length >= 4 && lower.includes(name.toLowerCase())) problems.push('Do not include your name in your password.');
    const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(password)).length;
    if (password.length < 16 && classes < 3) {
      problems.push('Mix at least three of: lowercase, uppercase, numbers, symbols (or use 16+ characters).');
    }
    if (problems.length) {
      throw new BadRequestException({ code: 'WEAK_PASSWORD', message: problems[0], details: problems });
    }
  }
}
