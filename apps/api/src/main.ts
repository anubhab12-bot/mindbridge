import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApp } from './bootstrap.js';
import { JsonLogger } from './common/logging/json-logger.js';
import { AppConfigService } from './config/app-config.service.js';

async function bootstrap() {
  const logger = new JsonLogger((process.env['LOG_LEVEL'] as 'info') ?? 'info');
  const app = await NestFactory.create(AppModule, { logger, bufferLogs: true });
  configureApp(app);
  app.enableShutdownHooks();
  const port = app.get(AppConfigService).get('PORT');
  await app.listen(port, '0.0.0.0');
  logger.log(`MindBridge API listening on port ${port}`, 'Bootstrap');
}

await bootstrap();
