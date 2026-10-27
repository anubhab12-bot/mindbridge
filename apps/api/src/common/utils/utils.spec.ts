import { describe, expect, it } from 'vitest';
import { addDays, dayOfWeek, isValidTimeZone, localDate, zonedTimeToUtc } from './dates.js';
import { REDACTED, redact } from './redact.js';

describe('redact', () => {
  it('removes secrets and sensitive content from nested log data', () => {
    const out = redact({
      email: 'a@example.org',
      password: 'hunter2hunter2',
      nested: { refreshToken: 'x', content: 'my journal entry', ok: 1 },
      list: [{ authorization: 'Bearer y' }],
    }) as Record<string, any>;
    expect(out['password']).toBe(REDACTED);
    expect(out['nested'].refreshToken).toBe(REDACTED);
    expect(out['nested'].content).toBe(REDACTED);
    expect(out['nested'].ok).toBe(1);
    expect(out['list'][0].authorization).toBe(REDACTED);
  });
});

describe('dates', () => {
  it('validates time zones', () => {
    expect(isValidTimeZone('Asia/Kolkata')).toBe(true);
    expect(isValidTimeZone('Mars/Olympus')).toBe(false);
  });

  it('converts local wall time to UTC (IST is UTC+05:30)', () => {
    expect(zonedTimeToUtc('2026-11-02', '10:00', 'Asia/Kolkata').toISOString()).toBe('2026-11-02T04:30:00.000Z');
  });

  it('computes the local calendar date', () => {
    expect(localDate(new Date('2026-11-01T20:00:00Z'), 'Asia/Kolkata')).toBe('2026-11-02');
    expect(localDate(new Date('2026-11-01T20:00:00Z'), 'UTC')).toBe('2026-11-01');
  });

  it('does date arithmetic across month boundaries', () => {
    expect(addDays('2026-10-30', 3)).toBe('2026-11-02');
    expect(dayOfWeek('2026-11-02')).toBe(1); // Monday
  });
});
