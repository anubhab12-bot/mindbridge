import { Test } from '@nestjs/testing';
import { getConnectionToken } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { afterAll, describe, expect, it } from 'vitest';
import { AppModule } from './app.module.js';
import { REDIS } from './common/redis/redis.module.js';
import { AiChatService } from './modules/ai/ai-chat.service.js';
import { AdminService } from './modules/admin/admin.service.js';
import { PrivacyService } from './modules/privacy/privacy.service.js';

/**
 * Compiles the full dependency-injection graph without a database: the Mongoose connection is
 * replaced by an unconnected one (models compile, nothing is sent) and Redis by a stub.
 * Catches missing providers and import cycles that unit tests with hand-made fakes cannot.
 */
describe('AppModule wiring', () => {
  const conn = mongoose.createConnection();
  afterAll(async () => {
    await conn.close();
  });

  it('resolves every provider', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(getConnectionToken())
      .useValue(conn)
      .overrideProvider(REDIS)
      .useValue({ quit: async () => 'OK', incr: async () => 1, expire: async () => 1, eval: async () => [1, 0, 0] })
      .compile();
    expect(moduleRef.get(AiChatService)).toBeDefined();
    expect(moduleRef.get(AdminService)).toBeDefined();
    expect(moduleRef.get(PrivacyService)).toBeDefined();
    await moduleRef.close();
  }, 30_000);
});
