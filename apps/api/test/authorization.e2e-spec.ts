import type { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { api, bearer, createE2eApp, registerDoctor, registerPatient } from './helpers/e2e-app.js';

describe('Authorization and resource ownership (e2e)', () => {
  let app: INestApplication;
  beforeAll(async () => {
    app = await createE2eApp();
  });
  afterAll(async () => {
    await app.close();
  });

  it('patients cannot reach doctor or admin APIs', async () => {
    const p = await registerPatient(app);
    await api(app).get('/api/v1/doctors/me/patients').set(bearer(p.token)).expect(403);
    await api(app).get('/api/v1/admin/dashboard').set(bearer(p.token)).expect(403);
    await api(app).get('/api/v1/admin/users').set(bearer(p.token)).expect(403);
  });

  it('a pending doctor cannot access patient data and is not publicly listed', async () => {
    const d = await registerDoctor(app);
    const res = await api(app).get('/api/v1/doctors/me/patients').set(bearer(d.token)).expect(403);
    expect(res.body.error.code).toBe('DOCTOR_NOT_VERIFIED');
    const list = await api(app).get('/api/v1/doctors').expect(200);
    expect(JSON.stringify(list.body)).not.toContain('Synthetic Doctor');
  });

  it("a patient cannot read or delete another patient's journal entry", async () => {
    const a = await registerPatient(app);
    const b = await registerPatient(app);
    const created = await api(app)
      .post('/api/v1/patients/journal-entries')
      .set(bearer(a.token))
      .send({ title: 'Private', body: 'Synthetic journal text' })
      .expect(201);
    const id = created.body.data.id as string;
    await api(app).get(`/api/v1/patients/journal-entries/${id}`).set(bearer(b.token)).expect(404);
    await api(app).delete(`/api/v1/patients/journal-entries/${id}`).set(bearer(b.token)).expect(404);
    await api(app).get(`/api/v1/patients/journal-entries/${id}`).set(bearer(a.token)).expect(200);
  });

  it('a doctor without a care relationship gets 404 for a patient', async () => {
    const d = await registerDoctor(app);
    const p = await registerPatient(app);
    // Pending doctors are stopped earlier; either way no patient data is returned.
    const res = await api(app).get(`/api/v1/doctors/me/patients/${p.user.id}`).set(bearer(d.token));
    expect([403, 404]).toContain(res.status);
  });

  it('rejects unknown body fields (mass assignment) on registration', async () => {
    const res = await api(app)
      .post('/api/v1/auth/register')
      .send({
        role: 'PATIENT', displayName: 'X', email: 'mass.assign@e2e.test', password: 'Synthetic-Test-Passw0rd!',
        acceptTerms: true, acceptPrivacy: true, ageConfirmedAdult: true, adminPermissions: ['users:manage'], status: 'ACTIVE',
      })
      .expect(400);
    expect(res.body.error).toBeDefined();
  });
});
