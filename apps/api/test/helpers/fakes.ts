import type { AppConfigService } from '../../src/config/app-config.service.js';

/** Minimal chainable stand-in for a Mongoose query: every builder returns itself; lean/exec resolve. */
export function query<T>(result: T) {
  const q: Record<string, unknown> = {};
  for (const m of ['sort', 'skip', 'limit', 'select', 'populate']) q[m] = () => q;
  q['lean'] = () => Promise.resolve(result);
  q['exec'] = () => Promise.resolve(result);
  // Intentionally thenable: Mongoose queries can be awaited directly.
  // oxlint-disable-next-line unicorn/no-thenable
  q['then'] = (res: (v: T) => unknown, rej: (e: unknown) => unknown) => Promise.resolve(result).then(res, rej);
  return q;
}

export function fakeConfig(overrides: Record<string, unknown> = {}): AppConfigService {
  const values: Record<string, unknown> = {
    FIELD_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64'),
    CRISIS_RESOURCE_MAX_AGE_DAYS: 180,
    AI_DAILY_MESSAGE_QUOTA: 3,
    AI_CONVERSATION_RETENTION_DAYS: 365,
    AI_SERVICE_URL: 'http://127.0.0.1:59999',
    AI_SERVICE_TOKEN: 'test-ai-service-token-0123456789-abcdefghijk',
    AI_SERVICE_TIMEOUT_MS: 1000,
    ...overrides,
  };
  return {
    get: (k: string) => values[k],
    corsOrigins: String(values['CORS_ORIGINS'] ?? 'http://localhost:4200').split(','),
    isProduction: false,
    isTest: true,
  } as unknown as AppConfigService;
}
