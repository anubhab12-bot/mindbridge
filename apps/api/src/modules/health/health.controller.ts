import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { Redis } from 'ioredis';
import type { Connection } from 'mongoose';
import { Public } from '../../common/auth/decorators.js';
import { REDIS } from '../../common/redis/redis.module.js';

@ApiTags('health')
@SkipThrottle()
@Public()
@Controller({ path: 'health', version: '1' })
export class HealthController {
  constructor(
    @InjectConnection() private readonly mongo: Connection,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Liveness probe (public).' })
  live() {
    return { status: 'ok' };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe: MongoDB and Redis reachable (public, no details beyond up/down).' })
  async ready() {
    const mongo = this.mongo.readyState === 1;
    const redis = await this.redis
      .ping()
      .then((r) => r === 'PONG')
      .catch(() => false);
    const body = { status: mongo && redis ? 'ok' : 'degraded', mongo: mongo ? 'up' : 'down', redis: redis ? 'up' : 'down' };
    if (!mongo) throw new ServiceUnavailableException(body);
    return body;
  }
}
