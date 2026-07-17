import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AuthResult,
  LoginFormData,
  RegisterFormData,
  SocialProvider,
} from '../models/auth.model';

const SESSION_KEY = 'has_valid_session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly backendUrl = environment.backendUrl;

  /** ----- Session helpers ----- */
  setSession(value: boolean): void {
    if (value) {
      localStorage.setItem(SESSION_KEY, 'true');
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  }

  hasSession(): boolean {
    return localStorage.getItem(SESSION_KEY) === 'true';
  }

  /** ----- Local auth ----- */
  async register(data: RegisterFormData): Promise<AuthResult> {
    try {
      await firstValueFrom(
        this.http.post(
          `${this.backendUrl}/user/register`,
          {
            email: data.email,
            username: data.username,
            password: data.password,
          },
          { withCredentials: true },
        ),
      );
      return { success: true };
    } catch (err) {
      return this.handleError(err, 'Registration');
    }
  }

  async login(data: LoginFormData): Promise<AuthResult> {
    try {
      await firstValueFrom(
        this.http.post(
          `${this.backendUrl}/auth/local/login`,
          { identity: data.email, password: data.password },
          { withCredentials: true },
        ),
      );
      this.setSession(true);
      return { success: true };
    } catch (err) {
      return this.handleError(err, 'Login');
    }
  }

  async verifyAccount(code: string): Promise<AuthResult> {
    try {
      await firstValueFrom(
        this.http.post(
          `${this.backendUrl}/user/verify-account`,
          { code },
          { withCredentials: true },
        ),
      );
      return { success: true };
    } catch (err) {
      return this.handleError(err, 'Verification');
    }
  }

  /** ----- Social auth (web OAuth redirect flow) ----- */
  startSocialLogin(provider: SocialProvider): void {
    const redirectUri = `${window.location.origin}/login`;

    const url =
      provider === 'Google'
        ? this.buildGoogleAuthUrl(redirectUri)
        : this.buildGithubAuthUrl(redirectUri);

    window.location.href = url;
  }

  async exchangeSocialCode(
    provider: SocialProvider,
    code: string,
  ): Promise<AuthResult> {
    const endpoint =
      provider === 'Google'
        ? `${this.backendUrl}/auth/oauth/google/login`
        : `${this.backendUrl}/auth/oauth/github/login`;

    try {
      await firstValueFrom(
        this.http.post(endpoint, { code }, { withCredentials: true }),
      );
      this.setSession(true);
      return { success: true };
    } catch (err) {
      return this.handleError(err, `${provider} login`);
    }
  }

  private buildGoogleAuthUrl(redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: environment.googleClientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'consent',
      state: 'google',
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  private buildGithubAuthUrl(redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: environment.githubClientId,
      redirect_uri: redirectUri,
      scope: 'read:user user:email',
      state: 'github',
    });
    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  /**
   * Maps backend / network failures to a friendly message, mirroring the
   * status handling from the nativeat auth service.
   */
  private handleError(err: unknown, context: string): AuthResult {
    if (!(err instanceof HttpErrorResponse)) {
      console.error(`${context} network error:`, err);
      return {
        success: false,
        error: 'Network error. Please check your connection and try again.',
      };
    }

    const backendMessage = err.error?.message || err.error?.error || '';

    switch (err.status) {
      case 0:
        return {
          success: false,
          error: 'Network error. Please check your connection and try again.',
        };
      case 400:
        return {
          success: false,
          error: backendMessage || 'The request could not be processed. Please try again.',
        };
      case 422:
        return {
          success: false,
          error:
            backendMessage ||
            'Invalid input. Please check your email, username, and password format.',
        };
      case 401:
        return {
          success: false,
          error:
            backendMessage ||
            'Invalid email/username or password. If you just registered, please verify your email first.',
        };
      case 409:
        return {
          success: false,
          error: backendMessage || 'This email or username is already in use.',
        };
      case 429:
        return {
          success: false,
          error:
            backendMessage || 'Too many attempts. Please wait a moment and try again.',
        };
      case 500:
        return { success: false, error: 'Server error. Please try again later.' };
      default:
        return {
          success: false,
          error: backendMessage || `Technical difficulties (Error ${err.status}).`,
        };
    }
  }
}
