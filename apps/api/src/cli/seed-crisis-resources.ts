/**
 * Loads the officially verified crisis resources (see crisis-resources.seed-data.ts) into the
 * admin-editable registry. Idempotent. Administrators must re-verify entries before launch.
 *
 * Usage (from apps/api, after `npm run build`): node dist/cli/seed-crisis-resources.js
 */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppConfigModule } from '../config/config.module.js';
import { AppConfigService } from '../config/app-config.service.js';
import { AuditModule } from '../modules/audit/audit.module.js';
import { AuditService } from '../modules/audit/audit.service.js';
import { CrisisResourcesService } from '../modules/crisis-resources/crisis-resources.service.js';
import { CrisisResource, CrisisResourceSchema } from '../modules/crisis-resources/schemas/crisis-resource.schema.js';

@Module({
  imports: [
    AppConfigModule,
    MongooseModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({ uri: config.get('MONGO_URI'), serverSelectionTimeoutMS: 10_000 }),
    }),
    MongooseModule.forFeature([{ name: CrisisResource.name, schema: CrisisResourceSchema }]),
    AuditModule,
  ],
  providers: [CrisisResourcesService],
})
class SeedCrisisModule {}

async function main() {
  const app = await NestFactory.createApplicationContext(SeedCrisisModule, { logger: ['error'] });
  try {
    const inserted = await app.get(CrisisResourcesService).seedVerified();
    await app.get(AuditService).record({ action: 'crisis_resource.seeded', metadata: { inserted, via: 'cli' } });
    console.log(`Crisis resources seeded: ${inserted} new entr${inserted === 1 ? 'y' : 'ies'}. Re-verify them in Admin > Crisis resources before launch.`);
  } finally {
    await app.close();
  }
}

main().catch((err: Error) => {
  console.error(`Failed: ${err.message}`);
  process.exit(1);
});
