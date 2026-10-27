import { provideHttpClient, withInterceptors, withXsrfConfiguration } from '@angular/common/http';
import {
  type ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling, withRouterConfig } from '@angular/router';
import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';
import { AuthService } from './core/auth/auth.service';
import { FeatureFlagsService } from './core/services/feature-flags.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' }),
      withRouterConfig({ paramsInheritanceStrategy: 'always' }),
    ),
    // CSRF for cookie routes is handled with a custom header; the default XSRF cookie flow is unused.
    provideHttpClient(withInterceptors([authInterceptor]), withXsrfConfiguration({})),
    provideAppInitializer(async () => {
      await Promise.all([inject(AuthService).init(), inject(FeatureFlagsService).load()]);
    }),
  ],
};
