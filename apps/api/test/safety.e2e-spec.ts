import type { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CrisisResourcesService } from '../src/modules/crisis-resources/crisis-resources.service.js';
import { api, bearer, createE2eApp, registerPatient } from './helpers/e2e-app.js';

/**
 * AI_SERVICE_URL points at a closed port in tests, so these exercise the degraded path:
 * the API must still screen locally and show verified crisis resources.
 */
describe('Crisis safety (e2e)', () => {
  let app: INestApplication;
  beforeAll(async () => {
    app = await createE2eApp();
    await app.get(CrisisResourcesService).seedVerified();
  });
  afterAll(async () => {
    await app.close();
  });

  it('serves verified crisis resources publicly, with source and verification date', async () => {
    const res = await api(app).get('/api/v1/crisis-resources?country=IN').expect(200);
    const resources = res.body.data.resources as { phone: string; sourceUrl: string; verifiedAt: string }[];
    expect(resources.map((r) => r.phone)).toEqual(expect.arrayContaining(['112', '14416']));
    for (const r of resources) {
      expect(r.sourceUrl).toMatch(/^https:\/\//);
      expect(r.verifiedAt).toBeTruthy();
    }
    expect(res.body.data.fallbackAdvice).toMatch(/emergency/);
  });

  it('returns only fallback advice for a country without verified entries', async () => {
    const res = await api(app).get('/api/v1/crisis-resources?country=ZZ').expect(200);
    expect(res.body.data.resources).toEqual([]);
    expect(res.body.data.fallbackAdvice).toBeTruthy();
  });

  it('requires AI consent before the companion processes messages', async () => {
    const p = await registerPatient(app, { verify: true, aiConsent: false });
    const res = await api(app).post('/api/v1/ai/conversations').set(bearer(p.token)).send({}).expect(403);
    expect(res.body.error.code).toBe('AI_CONSENT_REQUIRED');
  });

  it('shows crisis resources even when the AI service is unavailable', async () => {
    const p = await registerPatient(app, { verify: true, aiConsent: true });
    const conv = await api(app).post('/api/v1/ai/conversations').set(bearer(p.token)).send({}).expect(201);
    const res = await api(app)
      .post(`/api/v1/ai/conversations/${conv.body.data.id}/messages`)
      .set(bearer(p.token))
      .send({ content: 'I want to end my life' })
      .expect(201);
    const reply = res.body.data.reply;
    expect(reply.safety.crisisMode).toBe(true);
    expect(reply.safety.resources.resources.length).toBeGreaterThan(0);
    expect(reply.content).not.toMatch(/\d{3,}/); // numbers come from the registry, not the text
  });

  it('a patient cannot read another patient’s conversation', async () => {
    const a = await registerPatient(app, { verify: true, aiConsent: true });
    const b = await registerPatient(app, { verify: true, aiConsent: true });
    const conv = await api(app).post('/api/v1/ai/conversations').set(bearer(a.token)).send({}).expect(201);
    await api(app).get(`/api/v1/ai/conversations/${conv.body.data.id}/messages`).set(bearer(b.token)).expect(404);
  });
});
