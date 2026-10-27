import { type INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { randomUUID } from 'node:crypto';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import { ResponseEnvelopeInterceptor } from './common/interceptors/response-envelope.interceptor.js';
import { AppConfigService } from './config/app-config.service.js';
import { CSRF_HEADER } from './modules/auth/guards/csrf.guard.js';

/** Shared HTTP setup for the server entrypoint and end-to-end tests. */
export function configureApp(app: INestApplication) {
  const config = app.get(AppConfigService);
  const express = app as NestExpressApplication;

  // Behind the nginx / platform load balancer; trust only private-network proxies for req.ip.
  express.set('trust proxy', 'loopback, linklocal, uniquelocal');
  express.disable('x-powered-by');
  express.useBodyParser('json', { limit: '256kb' });

  app.use((req: Request & { id?: string }, res: Response, next: NextFunction) => {
    const incoming = req.headers['x-request-id'];
    req.id = typeof incoming === 'string' && /^[\w-]{8,64}$/.test(incoming) ? incoming : randomUUID();
    res.setHeader('x-request-id', req.id);
    next();
  });

  app.use(
    helmet({
      contentSecurityPolicy: {
        // The API only serves JSON (and Swagger UI in non-production).
        directives: {
          defaultSrc: ["'none'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          frameAncestors: ["'none'"],
        },
      },
      crossOriginResourcePolicy: { policy: 'same-site' },
      referrerPolicy: { policy: 'no-referrer' },
      hsts: config.isProduction ? { maxAge: 31536000, includeSubDomains: true } : false,
    }),
  );
  app.use(cookieParser());
  app.enableCors({
    origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
      if (!origin || config.corsOrigins.includes(origin)) cb(null, true);
      else cb(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', CSRF_HEADER, 'x-request-id'],
    exposedHeaders: ['x-request-id'],
    maxAge: 600,
  });

  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
      stopAtFirstError: false,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new ResponseEnvelopeInterceptor());

  if (config.get('SWAGGER_ENABLED') && !config.isProduction) {
    const doc = new DocumentBuilder()
      .setTitle('MindBridge API')
      .setDescription(
        'REST API for MindBridge. Each operation summary states the permitted role(s) and resource-level rule. ' +
          'Responses are wrapped as { data, meta? }; errors as { error: { code, message, details? }, requestId }.',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, doc));
  }
  return app;
}
