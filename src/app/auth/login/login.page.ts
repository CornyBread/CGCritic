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

  ngOnInit(): void {
    // Surface an error bubbled up from a failed OAuth deep-link return.
    const oauthError = this.route.snapshot.queryParamMap.get('oauthError');
    if (oauthError) {
      this.error = oauthError;
      this.router.navigate([], { queryParams: {}, replaceUrl: true });
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
    // Opens the backend OAuth flow in the system browser; the deep link
    // (handled app-wide in AppComponent) resumes and routes to /home.
    await this.auth.startBackendOAuth(provider);
    this.loadingProvider = null;
  }

  goToRegister(): void {
    this.router.navigateByUrl('/register');
  }
}
