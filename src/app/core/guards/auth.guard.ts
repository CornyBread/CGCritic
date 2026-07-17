import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

/** Blocks protected routes when there is no local session. */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.hasSession()) {
    return true;
  }
  return router.createUrlTree(['/login']);
};
