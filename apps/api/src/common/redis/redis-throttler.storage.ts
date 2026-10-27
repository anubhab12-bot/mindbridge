import { Inject, Injectable } from '@nestjs/common';
import type { ThrottlerStorage } from '@nestjs/throttler';
import type { Redis } from 'ioredis';
import { REDIS } from './redis.module.js';

interface ThrottlerStorageRecord {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
}

/**
 * Redis-backed rate-limit counters so limits hold across API replicas and restarts.
 * Uses a fixed window per key; when the limit is exceeded the key is blocked for
 * `blockDuration`. If Redis is unreachable the request is allowed (fail-open) and the
 * per-account login lockout in MongoDB still protects credentials.
 */
@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage {
  private static readonly SCRIPT = `
    local hits = redis.call('INCR', KEYS[1])
    if hits == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
    local ttl = redis.call('PTTL', KEYS[1])
    local blockTtl = redis.call('PTTL', KEYS[2])
    if blockTtl <= 0 and hits > tonumber(ARGV[2]) then
      redis.call('SET', KEYS[2], '1', 'PX', ARGV[3])
      blockTtl = tonumber(ARGV[3])
    end
    return {hits, ttl, blockTtl}
  `;

  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async increment(key: string, ttl: number, limit: number, blockDuration: number, throttlerName: string): Promise<ThrottlerStorageRecord> {
    const hitKey = `rl:${throttlerName}:${key}`;
    const blockKey = `rl:block:${throttlerName}:${key}`;
    try {
      const [hits, ttlMs, blockMs] = (await this.redis.eval(
        RedisThrottlerStorage.SCRIPT,
        2,
        hitKey,
        blockKey,
        String(ttl),
        String(limit),
        String(blockDuration > 0 ? blockDuration : ttl),
      )) as [number, number, number];
      return {
        totalHits: hits,
        timeToExpire: Math.ceil(Math.max(ttlMs, 0) / 1000),
        isBlocked: blockMs > 0,
        timeToBlockExpire: Math.ceil(Math.max(blockMs, 0) / 1000),
      };
    } catch {
      return { totalHits: 0, timeToExpire: 0, isBlocked: false, timeToBlockExpire: 0 };
    }
  }
}
