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
  IonModal,
} from '@ionic/angular/standalone';

import { AuthService } from '../core/services/auth.service';
import { UserService } from '../core/services/user.service';
import { ProfileMenuComponent } from './profile-menu/profile-menu.component';

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
    IonModal,
    ProfileMenuComponent,
  ],
})
export class HomePage {
  private readonly auth = inject(AuthService);
  private readonly users = inject(UserService);
  private readonly router = inject(Router);

  profileOpen = false;

  /** Placeholder avatar initials until the profile loads inside the panel. */
  get initials(): string {
    return 'CG';
  }

  openProfile(): void {
    this.profileOpen = true;
  }

  closeProfile(): void {
    this.profileOpen = false;
  }

  async logout(): Promise<void> {
    // Clears the server session; we drop the local session regardless of result.
    await this.users.logout();
    this.auth.setSession(false);
    this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}
