/**
 * Background worker: processes the BullMQ queue (emails, reminders, knowledge sync) and runs
 * scheduled maintenance. Runs as a separate process/container from the HTTP API.
 */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { JsonLogger } from './common/logging/json-logger.js';
import { PURGE_SWEEP_JOB } from './modules/privacy/privacy.service.js';
import { JobsService } from './modules/queues/jobs.service.js';
import { KNOWLEDGE_SYNC_JOB } from './modules/wellness/wellness.service.js';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: new JsonLogger((process.env['LOG_LEVEL'] as 'info') ?? 'info') });
  app.enableShutdownHooks();
  const jobs = app.get(JobsService);
  if (!jobs.enabled) {
    console.error('QUEUES_ENABLED is false; the worker has nothing to do.');
    await app.close();
    process.exit(1);
  }
  jobs.startWorker();
  // Hourly: purge accounts whose deletion grace period has ended.
  await jobs.schedule(PURGE_SWEEP_JOB, '15 * * * *');
  // Daily: refresh the AI knowledge base from published, reviewed content.
  await jobs.schedule(KNOWLEDGE_SYNC_JOB, '30 2 * * *');
}

main().catch((err: Error) => {
  console.error(`Worker failed to start: ${err.message}`);
  process.exit(1);
});
