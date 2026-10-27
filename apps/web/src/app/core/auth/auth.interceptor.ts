import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { API_BASE } from '../api/api.service';
import { AuthService } from './auth.service';

/**
 * Adds the in-memory access token to API calls. On a 401 it refreshes once (single flight)
 * and retries; if the session cannot be refreshed it signs the user out.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(API_BASE)) return next(req);
  const auth = inject(AuthService);
  const router = inject(Router);
  const withToken = (token: string | null) => (token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req);

  return next(withToken(auth.token)).pipe(
    catchError((err: unknown) => {
      if (!(err instanceof HttpErrorResponse) || err.status !== 401 || !auth.token) return throwError(() => err);
      return from(auth.refresh()).pipe(
        switchMap((ok) => {
          if (ok) return next(withToken(auth.token));
          void router.navigate(['/login'], { queryParams: { expired: 1 } });
          return throwError(() => err);
        }),
      );
    }),
  );
};
