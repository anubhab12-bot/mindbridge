import type { LoggerService } from '@nestjs/common';
import { redact } from '../utils/redact.js';

type Level = 'debug' | 'info' | 'warn' | 'error';
const ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

/**
 * Structured JSON logger. Context objects pass through `redact` so tokens, passwords and
 * free-text patient content cannot be logged by accident.
 */
export class JsonLogger implements LoggerService {
  constructor(private readonly minLevel: Level = 'info') {}

  private write(level: Level, message: unknown, context?: string, extra?: unknown) {
    if (ORDER[level] < ORDER[this.minLevel]) return;
    const entry: Record<string, unknown> = {
      ts: new Date().toISOString(),
      level,
      context,
      msg: typeof message === 'string' ? message : redact(message),
    };
    if (extra !== undefined) entry['extra'] = redact(extra);
    const line = JSON.stringify(entry);
    if (level === 'error' || level === 'warn') process.stderr.write(`${line}\n`);
    else process.stdout.write(`${line}\n`);
  }

  log(message: unknown, context?: string) {
    this.write('info', message, context);
  }
  error(message: unknown, trace?: string, context?: string) {
    this.write('error', message, context, trace ? { trace } : undefined);
  }
  warn(message: unknown, context?: string) {
    this.write('warn', message, context);
  }
  debug(message: unknown, context?: string) {
    this.write('debug', message, context);
  }
  verbose(message: unknown, context?: string) {
    this.write('debug', message, context);
  }
}
