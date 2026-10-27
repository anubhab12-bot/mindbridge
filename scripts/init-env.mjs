#!/usr/bin/env node
// Creates a local `.env` from `.env.example`, filling every CHANGE_ME value with a fresh random secret.
// Works on Windows, macOS and Linux (Node 20+). Never overwrites an existing `.env` unless --force is given.
// The generated file is git-ignored; never commit it.
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const target = join(root, '.env');
const force = process.argv.includes('--force');

if (existsSync(target) && !force) {
  console.error('.env already exists. Re-run with --force to replace it (your current secrets will be lost).');
  process.exit(1);
}

const secret = (bytes = 48) => randomBytes(bytes).toString('base64url');
let text = readFileSync(join(root, '.env.example'), 'utf8');
text = text.replace(/^FIELD_ENCRYPTION_KEY=.*$/m, `FIELD_ENCRYPTION_KEY=${randomBytes(32).toString('base64')}`);
text = text.replace(/^([A-Z0-9_]+)=CHANGE_ME.*$/gm, (_m, key) => `${key}=${secret()}`);
writeFileSync(target, text, { mode: 0o600 });
console.log(`Wrote ${target} with fresh random secrets.`);
