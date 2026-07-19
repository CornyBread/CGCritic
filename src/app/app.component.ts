import { Component, NgZone, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { App, URLOpenListenerEvent } from '@capacitor/app';
import { Browser } from '@capacitor/browser';

import { AuthService, OAUTH_REDIRECT } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly zone = inject(NgZone);

  ngOnInit(): void {
    // Catch the OAuth deep link the backend redirects to after the exchange.
    App.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
      if (!event.url.startsWith(OAUTH_REDIRECT)) return;
      // Native events fire outside Angular's zone; re-enter it to route.
      this.zone.run(() => void this.completeOAuth(event.url));
    });
  }

  private async completeOAuth(url: string): Promise<void> {
    await Browser.close().catch(() => undefined);

    const result = await this.auth.handleOAuthDeepLink(url);
    if (result.success) {
      this.router.navigateByUrl('/home', { replaceUrl: true });
    } else {
      this.router.navigate(['/login'], {
        queryParams: { oauthError: result.error },
        replaceUrl: true,
      });
    }
  }
}
