import { Global, Inject, Injectable, Module, type OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';
import { AppConfigService } from '../../config/app-config.service.js';

export const REDIS = Symbol('REDIS');

@Injectable()
class RedisLifecycle implements OnModuleDestroy {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}
  async onModuleDestroy() {
    await this.redis.quit().catch(() => undefined);
  }
}

@Global()
@Module({
  providers: [
    {
      provide: REDIS,
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) =>
        new Redis(config.get('REDIS_URL'), { maxRetriesPerRequest: 2, enableOfflineQueue: true, lazyConnect: false }),
    },
    RedisLifecycle,
  ],
  exports: [REDIS],
})
export class RedisModule {}
