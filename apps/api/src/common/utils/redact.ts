/**
 * Keys whose values must never reach logs or audit metadata. Matching is case-insensitive
 * and substring-based so variants such as `refreshToken` or `newPassword` are caught.
 */
const SENSITIVE_KEY_PATTERNS = [
  'password',
  'token',
  'secret',
  'authorization',
  'cookie',
  'otp',
  'mfacode',
  'content',
  'body',
  'message',
  'journal',
  'note',
  'answers',
  'reason',
  'phone',
];

export const REDACTED = '[REDACTED]';

export function isSensitiveKey(key: string): boolean {
  const k = key.toLowerCase();
  return SENSITIVE_KEY_PATTERNS.some((p) => k.includes(p));
}

/** Deep-copies a value replacing sensitive keys. Depth-limited to avoid pathological objects. */
export function redact(value: unknown, depth = 0): unknown {
  if (depth > 6) return '[TRUNCATED]';
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => redact(v, depth + 1));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = isSensitiveKey(k) ? REDACTED : redact(v, depth + 1);
    }
    return out;
  }
  if (typeof value === 'string' && value.length > 500) return `${value.slice(0, 500)}…`;
  return value;
}
