import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
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
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['../auth.shared.scss', './login.page.scss'],
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
export class LoginPage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  email = '';
  password = '';
  showPassword = false;

  loading = false;
  loadingProvider: SocialProvider | null = null;
  error: string | null = null;

  async ngOnInit(): Promise<void> {
    // Handle the OAuth redirect callback (?code=...&state=google|github)
    const code = this.route.snapshot.queryParamMap.get('code');
    const state = this.route.snapshot.queryParamMap.get('state');

    if (code && (state === 'google' || state === 'github')) {
      const provider: SocialProvider = state === 'google' ? 'Google' : 'GitHub';
      this.loadingProvider = provider;

      const result = await this.auth.exchangeSocialCode(provider, code);

      // Clean the OAuth params out of the URL.
      this.router.navigate([], { queryParams: {}, replaceUrl: true });

      if (result.success) {
        this.router.navigateByUrl('/home', { replaceUrl: true });
      } else {
        this.error = result.error ?? `${provider} authentication failed.`;
      }
      this.loadingProvider = null;
    }
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  async onSubmit(): Promise<void> {
    if (this.loading) return;
    this.loading = true;
    this.error = null;

    const result = await this.auth.login({
      email: this.email,
      password: this.password,
    });

    if (result.success) {
      this.router.navigateByUrl('/home', { replaceUrl: true });
    } else {
      this.error = result.error ?? 'Login failed. Please try again.';
    }
    this.loading = false;
  }

  async onSocial(provider: SocialProvider): Promise<void> {
    this.error = null;
    this.loadingProvider = provider;
    // Full-page redirect to the provider; resolves back in ngOnInit().
    this.auth.startSocialLogin(provider);
  }

  goToRegister(): void {
    this.router.navigateByUrl('/register');
  }
}
