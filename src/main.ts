import { bootstrapApplication } from '@angular/platform-browser';
import {
  RouteReuseStrategy,
  provideRouter,
  withPreloading,
  PreloadAllModules,
} from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';
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
} from 'ionicons/icons';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';

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
});

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideHttpClient(withFetch()),
    provideRouter(routes, withPreloading(PreloadAllModules)),
  ],
});
