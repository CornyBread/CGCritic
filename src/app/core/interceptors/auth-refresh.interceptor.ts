import {
  HttpClient,
  HttpErrorResponse,
  HttpInterceptorFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  Observable,
  catchError,
  finalize,
  shareReplay,
  switchMap,
  throwError,
} from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

/**
 * Shared across all requests so several simultaneous 401s trigger a single
 * refresh instead of one per request. Reset once the refresh settles.
 */
let refresh$: Observable<unknown> | null = null;

/**
 * Endpoints where a 401 is expected or terminal, so it must NOT trigger a
 * refresh (avoids loops and pointless refreshes on login/register/etc.).
 */
const NO_REFRESH_PATHS = [
  '/auth/refresh-session',
  '/auth/local/login',
  '/auth/oauth/',
  '/auth/logout',
  '/user/register',
  '/user/verify-account',
];

/**
 * On a 401 from an authenticated API call, transparently refresh the access
 * token via POST /auth/refresh-session (using the refresh-token cookie) and
 * retry the original request once. If the refresh fails, the session is dead:
 * clear it locally and send the user back to the login screen.
 */
export const authRefreshInterceptor: HttpInterceptorFn = (req, next) => {
  const isApi = req.url.startsWith(environment.backendUrl);
  const skip = !isApi || NO_REFRESH_PATHS.some((p) => req.url.includes(p));
  if (skip) return next(req);

  const http = inject(HttpClient);
  const auth = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((err) => {
      if (!(err instanceof HttpErrorResponse) || err.status !== 401) {
        return throwError(() => err);
      }

      // Single-flight refresh shared by every request that 401s at once.
      refresh$ ??= http
        .post(
          `${environment.backendUrl}/auth/refresh-session`,
          {},
          { withCredentials: true },
        )
        .pipe(
          shareReplay(1),
          finalize(() => (refresh$ = null)),
        );

      return refresh$.pipe(
        // Refresh succeeded → retry the original request once. A further 401
        // here is not retried (this next(req) is outside the catch above).
        switchMap(() => next(req)),
        catchError((refreshErr) => {
          auth.setSession(false);
          void router.navigateByUrl('/login', { replaceUrl: true });
          return throwError(() => refreshErr);
        }),
      );
    }),
  );
};
