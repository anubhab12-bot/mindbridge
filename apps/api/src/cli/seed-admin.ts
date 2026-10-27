/**
 * Creates the initial administrator. This is the ONLY way to obtain an ADMIN account;
 * public registration rejects the role.
 *
 * Usage (from apps/api, after `npm run build`):
 *   node dist/cli/seed-admin.js --email admin@example.org --name "Platform Admin"
 * The password is read from the ADMIN_PASSWORD environment variable or, when run in a
 * terminal, prompted for without echo. It is never logged.
 */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { AccountStatus, ALL_ADMIN_PERMISSIONS, Role } from '@mindbridge/shared-types';
import type { Model } from 'mongoose';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import { AuditService } from '../modules/audit/audit.service.js';
import { PasswordService } from '../modules/auth/password.service.js';
import { User } from '../modules/users/schemas/user.schema.js';
import { CliModule } from './cli.module.js';

async function promptHidden(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  const out = rl as unknown as { _writeToOutput: (s: string) => void; output: NodeJS.WriteStream };
  let muted = false;
  out._writeToOutput = (s: string) => {
    if (!muted) out.output.write(s);
  };
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    });
    muted = true;
  });
}

async function main() {
  const { values } = parseArgs({
    options: { email: { type: 'string' }, name: { type: 'string' } },
  });
  const email = values.email?.trim().toLowerCase();
  const name = values.name?.trim() || 'Administrator';
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    console.error('Provide a valid --email.');
    process.exit(2);
  }

  let password = process.env['ADMIN_PASSWORD'];
  if (!password) {
    if (!process.stdin.isTTY) {
      console.error('Set ADMIN_PASSWORD or run in an interactive terminal.');
      process.exit(2);
    }
    password = await promptHidden('Admin password (min 12 characters): ');
    const confirm = await promptHidden('Confirm password: ');
    if (password !== confirm) {
      console.error('Passwords do not match.');
      process.exit(2);
    }
  }
  if (password.length < 12) {
    console.error('Admin passwords must be at least 12 characters.');
    process.exit(2);
  }

  const app = await NestFactory.createApplicationContext(CliModule, { logger: ['error'] });
  try {
    const users = app.get<Model<User>>(getModelToken(User.name));
    const passwords = app.get(PasswordService);
    passwords.assertStrong(password, email, name);
    if (await users.exists({ email })) {
      console.error('An account with this email already exists. No changes made.');
      process.exitCode = 1;
      return;
    }
    const admin = await users.create({
      email,
      displayName: name,
      role: Role.ADMIN,
      status: AccountStatus.ACTIVE,
      passwordHash: await passwords.hash(password),
      emailVerifiedAt: new Date(),
      adminPermissions: ALL_ADMIN_PERMISSIONS,
    });
    await app.get(AuditService).record({
      action: 'admin.seeded',
      resourceType: 'User',
      resourceId: admin._id.toString(),
      metadata: { via: 'cli' },
    });
    console.log(`Administrator created for ${email}. Sign in at /login and enable two-step sign-in under Settings.`);
  } finally {
    await app.close();
  }
}

main().catch((err: Error) => {
  console.error(`Failed: ${err.message}`);
  process.exit(1);
});
