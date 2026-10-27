import type { INestApplication } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import type { Connection } from 'mongoose';
import request from 'supertest';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/bootstrap.js';
import { MailService } from '../../src/modules/mail/mail.service.js';

export const CSRF = { 'x-mindbridge-csrf': '1' };
let counter = 0;

/** Boots the real application against the test database and wipes it first. */
export async function createE2eApp() {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication({ logger: ['error'] });
  configureApp(app);
  await app.init();
  const conn = app.get<Connection>(getConnectionToken());
  await conn.dropDatabase();
  await Promise.all(Object.values(conn.models).map((m) => m.syncIndexes()));
  return app;
}

export function api(app: INestApplication) {
  return request(app.getHttpServer());
}

export function uniqueEmail(prefix: string) {
  counter += 1;
  return `${prefix}.${Date.now()}.${counter}@e2e.test`;
}

export const PASSWORD = 'Synthetic-Test-Passw0rd!';

export async function registerPatient(app: INestApplication, opts: { verify?: boolean; aiConsent?: boolean } = {}) {
  const email = uniqueEmail('patient');
  const res = await api(app)
    .post('/api/v1/auth/register')
    .send({
      role: 'PATIENT',
      displayName: 'Synthetic Patient',
      email,
      password: PASSWORD,
      acceptTerms: true,
      acceptPrivacy: true,
      ageConfirmedAdult: true,
      aiProcessingConsent: opts.aiConsent ?? false,
    })
    .expect(201);
  if (opts.verify) await verifyEmail(app, email);
  return { email, token: res.body.data.accessToken as string, user: res.body.data.user, cookies: res.headers['set-cookie'] as unknown as string[] };
}

export async function registerDoctor(app: INestApplication) {
  const email = uniqueEmail('doctor');
  counter += 1;
  const res = await api(app)
    .post('/api/v1/auth/register')
    .send({
      role: 'DOCTOR',
      displayName: 'Synthetic Doctor',
      email,
      password: PASSWORD,
      acceptTerms: true,
      acceptPrivacy: true,
      doctor: {
        professionalCategory: 'CLINICAL_PSYCHOLOGIST',
        qualifications: ['Synthetic qualification'],
        registrationNumber: `E2E-${Date.now()}-${counter}`,
        registrationCouncil: 'Synthetic Council',
        specialties: ['anxiety'],
        languages: ['en'],
        yearsExperience: 5,
      },
    })
    .expect(201);
  return { email, token: res.body.data.accessToken as string, user: res.body.data.user };
}

export async function verifyEmail(app: INestApplication, email: string) {
  const mail = app.get(MailService).outbox.filter((m) => m.to === email).at(-1);
  const token = mail?.text.match(/token=([^\s&]+)/)?.[1];
  if (!token) throw new Error(`no verification email for ${email}`);
  await api(app).post('/api/v1/auth/verify-email').send({ token: decodeURIComponent(token) }).expect(200);
}

export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
