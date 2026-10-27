import type { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { api, bearer, createE2eApp, CSRF, PASSWORD, registerPatient, uniqueEmail } from './helpers/e2e-app.js';

describe('Authentication (e2e)', () => {
  let app: INestApplication;
  beforeAll(async () => {
    app = await createE2eApp();
  });
  afterAll(async () => {
    await app.close();
  });

  it('registers a patient with an HttpOnly, SameSite=Strict refresh cookie', async () => {
    const p = await registerPatient(app);
    expect(p.user.role).toBe('PATIENT');
    const cookie = p.cookies.find((c) => c.startsWith('mb_rt='))!;
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Strict/i);
    expect(cookie).toMatch(/Path=\/api\/v1\/auth/);
  });

  it('refuses to register an administrator', async () => {
    await api(app)
      .post('/api/v1/auth/register')
      .send({ role: 'ADMIN', displayName: 'X', email: uniqueEmail('admin'), password: PASSWORD, acceptTerms: true, acceptPrivacy: true })
      .expect(400);
  });

  it('never stores or returns the password hash', async () => {
    const p = await registerPatient(app);
    const me = await api(app).get('/api/v1/auth/me').set(bearer(p.token)).expect(200);
    expect(JSON.stringify(me.body)).not.toMatch(/passwordHash|argon2/);
  });

  it('uses one generic error for unknown email and wrong password', async () => {
    const p = await registerPatient(app);
    const wrong = await api(app).post('/api/v1/auth/login').send({ email: p.email, password: 'Wrong-Passw0rd!!' }).expect(401);
    const unknown = await api(app).post('/api/v1/auth/login').send({ email: uniqueEmail('nobody'), password: 'Wrong-Passw0rd!!' }).expect(401);
    expect(wrong.body.error.message).toBe(unknown.body.error.message);
  });

  it('rotates refresh tokens and revokes the family when an old token is replayed', async () => {
    const p = await registerPatient(app);
    const original = p.cookies.find((c) => c.startsWith('mb_rt='))!.split(';')[0]!;

    await api(app).post('/api/v1/auth/refresh').set('Cookie', original).expect(403); // no CSRF header
    const first = await api(app).post('/api/v1/auth/refresh').set('Cookie', original).set(CSRF).expect(200);
    const rotated = (first.headers['set-cookie'] as unknown as string[]).find((c) => c.startsWith('mb_rt='))!.split(';')[0]!;
    expect(rotated).not.toBe(original);

    // Replay of the old token: rejected, and the rotated token is revoked too.
    await api(app).post('/api/v1/auth/refresh').set('Cookie', original).set(CSRF).expect(401);
    await api(app).post('/api/v1/auth/refresh').set('Cookie', rotated).set(CSRF).expect(401);
  });

  it('logout ends the session immediately for access tokens too', async () => {
    const p = await registerPatient(app);
    const cookie = p.cookies.find((c) => c.startsWith('mb_rt='))!.split(';')[0]!;
    await api(app).post('/api/v1/auth/logout').set('Cookie', cookie).set(CSRF).set(bearer(p.token)).expect((r) => {
      expect([200, 204]).toContain(r.status);
    });
    await api(app).get('/api/v1/auth/me').set(bearer(p.token)).expect(401);
  });

  it('rejects requests without a token on protected routes', async () => {
    await api(app).get('/api/v1/patients/journal-entries').expect(401);
  });
});
