import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent,
  IonInput,
  IonButton,
  IonIcon,
  IonSpinner,
} from '@ionic/angular/standalone';

import { AuthService } from '../../core/services/auth.service';
import { SocialProvider } from '../../core/models/auth.model';
import { SocialAuthComponent } from '../social-auth/social-auth.component';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['../auth.shared.scss', './register.page.scss'],
  imports: [
    FormsModule,
    IonContent,
    IonInput,
    IonButton,
    IonIcon,
    IonSpinner,
    SocialAuthComponent,
  ],
})
export class RegisterPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  email = '';
  username = '';
  password = '';
  confirm = '';
  showPassword = false;

  loading = false;
  loadingProvider: SocialProvider | null = null;
  error: string | null = null;

  // Account verification step (shown after a successful registration).
  pendingVerification = false;
  verified = false;
  code = '';
  verifyLoading = false;

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  async onSubmit(): Promise<void> {
    if (this.loading) return;
    this.error = null;

    // Backend lowercases the username and only accepts alphanumeric characters.
    const username = this.username.trim().toLowerCase();

    if (!username || !/^[a-z0-9]+$/.test(username)) {
      this.error = 'Username may only contain letters and numbers.';
      return;
    }

    if (this.password !== this.confirm) {
      this.error = 'Passwords do not match.';
      return;
    }

    this.loading = true;
    const result = await this.auth.register({
      email: this.email.trim(),
      username,
      password: this.password,
    });

    if (result.success) {
      this.pendingVerification = true;
    } else {
      this.error = result.error ?? 'Registration failed. Please try again.';
    }
    this.loading = false;
  }

  async onVerify(): Promise<void> {
    if (this.code.length !== 6 || this.verifyLoading) return;
    this.verifyLoading = true;
    this.error = null;

    const result = await this.auth.verifyAccount(this.code);

    if (result.success) {
      this.verified = true;
    } else {
      this.error = result.error ?? 'Invalid or expired code. Try again.';
    }
    this.verifyLoading = false;
  }

  async onSocial(provider: SocialProvider): Promise<void> {
    this.error = null;
    this.loadingProvider = provider;
    this.auth.startSocialLogin(provider);
  }

  goToLogin(): void {
    this.router.navigateByUrl('/login');
  }
}
