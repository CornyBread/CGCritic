import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
} from '@ionic/angular/standalone';

import { AuthService } from '../core/services/auth.service';
import { UserService } from '../core/services/user.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  imports: [
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
  ],
})
export class HomePage {
  private readonly auth = inject(AuthService);
  private readonly users = inject(UserService);
  private readonly router = inject(Router);

  async logout(): Promise<void> {
    try {
      await this.users.logoutUser();
    } catch {
      // Ignore network failures on logout; we clear the local session anyway.
    }
    this.auth.setSession(false);
    this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}
