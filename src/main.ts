import { bootstrapApplication } from '@angular/platform-browser';
import {
  RouteReuseStrategy,
  provideRouter,
  withPreloading,
  PreloadAllModules,
} from '@angular/router';
import {
  provideHttpClient,
  withFetch,
  withInterceptors,
} from '@angular/common/http';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  mailOutline,
  mailUnreadOutline,
  lockClosedOutline,
  personOutline,
  shieldCheckmarkOutline,
  keypadOutline,
  eyeOutline,
  eyeOffOutline,
  logoGoogle,
  logoGithub,
  checkmarkCircle,
  logOutOutline,
  close,
  gameController,
  star,
  people,
  calendarOutline,
  createOutline,
  shieldCheckmark,
  closeCircle,
  starOutline,
} from 'ionicons/icons';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { authRefreshInterceptor } from './app/core/interceptors/auth-refresh.interceptor';

addIcons({
  'mail-outline': mailOutline,
  'mail-unread-outline': mailUnreadOutline,
  'lock-closed-outline': lockClosedOutline,
  'person-outline': personOutline,
  'shield-checkmark-outline': shieldCheckmarkOutline,
  'keypad-outline': keypadOutline,
  'eye-outline': eyeOutline,
  'eye-off-outline': eyeOffOutline,
  'logo-google': logoGoogle,
  'logo-github': logoGithub,
  'checkmark-circle': checkmarkCircle,
  'log-out-outline': logOutOutline,
  'close': close,
  'game-controller': gameController,
  'star': star,
  'people': people,
  'calendar-outline': calendarOutline,
  'create-outline': createOutline,
  'shield-checkmark': shieldCheckmark,
  'close-circle': closeCircle,
  'star-outline': starOutline,
});

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideHttpClient(withFetch(), withInterceptors([authRefreshInterceptor])),
    provideRouter(routes, withPreloading(PreloadAllModules)),
  ],
});
