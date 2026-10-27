import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { CryptoModule } from './common/crypto/crypto.module.js';
import { RedisThrottlerStorage } from './common/redis/redis-throttler.storage.js';
import { RedisModule } from './common/redis/redis.module.js';
import { ThrottlerStorageModule } from './common/redis/throttler-storage.module.js';
import { AppConfigModule } from './config/config.module.js';
import { AppConfigService } from './config/app-config.service.js';
import { AuditModule } from './modules/audit/audit.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { ConsentModule } from './modules/consent/consent.module.js';
import { HealthController } from './modules/health/health.controller.js';
import { MailModule } from './modules/mail/mail.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { JobsModule } from './modules/queues/jobs.module.js';
import { VerificationModule } from './modules/verification/verification.module.js';
import { AppointmentsModule } from './modules/appointments/appointments.module.js';
import { CareModule } from './modules/care/care.module.js';
import { DoctorsModule } from './modules/doctors/doctors.module.js';
import { JournalModule } from './modules/journal/journal.module.js';
import { MoodModule } from './modules/mood/mood.module.js';
import { AiModule } from './modules/ai/ai.module.js';
import { CrisisResourcesModule } from './modules/crisis-resources/crisis-resources.module.js';

@Module({
  imports: [
    AppConfigModule,
    MongooseModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        uri: config.get('MONGO_URI'),
        // Indexes are created on boot in dev/test; production runs `npm run db:sync-indexes` during deploy.
        autoIndex: !config.isProduction,
        serverSelectionTimeoutMS: 10_000,
      }),
    }),
    RedisModule,
    ThrottlerModule.forRootAsync({
      inject: [AppConfigService, RedisThrottlerStorage],
      useFactory: (config: AppConfigService, storage: RedisThrottlerStorage) => ({
        throttlers: [{ name: 'default', ttl: config.get('THROTTLE_TTL_SECONDS') * 1000, limit: config.get('THROTTLE_LIMIT') }],
        storage,
      }),
      imports: [ThrottlerStorageModule],
    }),
    CryptoModule,
    JobsModule,
    AuditModule,
    MailModule,
    NotificationsModule,
    ConsentModule,
    AuthModule,
    VerificationModule,
    CareModule,
    DoctorsModule,
    AppointmentsModule,
    MoodModule,
    JournalModule,
    CrisisResourcesModule,
    AiModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
