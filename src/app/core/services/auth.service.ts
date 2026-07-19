import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Browser } from '@capacitor/browser';

import { environment } from '../../../environments/environment';
import {
  AuthResult,
  LoginFormData,
  RegisterFormData,
  SocialProvider,
} from '../models/auth.model';

const SESSION_KEY = 'has_valid_session';

/** Deep link the backend must redirect to after the OAuth exchange. */
export const OAUTH_REDIRECT = 'com.cgcritic.app://oauth';

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

  /** ----- Social auth (backend-driven OAuth + deep-link return) ----- */

  /**
   * Opens the backend's OAuth entry point in the system browser. The backend
   * runs the whole exchange with the provider and, when done, redirects to the
   * `OAUTH_REDIRECT` deep link, which reopens the app.
   */
  async startBackendOAuth(provider: SocialProvider): Promise<void> {
    const slug = provider === 'Google' ? 'google' : 'github';
    const redirect = encodeURIComponent(OAUTH_REDIRECT);
    await Browser.open({
      url: `${this.backendUrl}/auth/oauth/${slug}?redirect_uri=${redirect}`,
    });
  }

  /**
   * Handles the deep link the backend redirects to after OAuth. Confirms the
   * session actually reached the app before declaring success.
   */
  async handleOAuthDeepLink(url: string): Promise<AuthResult> {
    let params: URLSearchParams;
    try {
      params = new URL(url).searchParams;
    } catch {
      params = new URLSearchParams(url.split('?')[1] ?? '');
    }

    if (params.get('status') === 'error' || params.get('error')) {
      return {
        success: false,
        error:
          params.get('error') ||
          'No se pudo iniciar sesión con el proveedor.',
      };
    }

    // If the backend returns a one-time token (needed because the system
    // browser's cookies aren't shared with the app), exchange it so the
    // session cookie lands in the app's native cookie store.
    const token = params.get('token');
    if (token) {
      try {
        await firstValueFrom(
          this.http.post(
            `${this.backendUrl}/auth/oauth/session`,
            { token },
            { withCredentials: true },
          ),
        );
      } catch (err) {
        return this.handleError(err, 'OAuth');
      }
    }

    // Verify the session is usable from the app before entering.
    try {
      await firstValueFrom(
        this.http.get(`${this.backendUrl}/user`, { withCredentials: true }),
      );
    } catch {
      return {
        success: false,
        error: 'No se pudo establecer la sesión. Inténtalo de nuevo.',
      };
    }

    this.setSession(true);
    return { success: true };
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

    // The backend exposes error details under `error` (validation errors carry
    // raw, technical text we must never surface to the user).
    const backendMessage = err.error?.message || err.error?.error || '';
    const isVerification = context.startsWith('Verification');

    switch (err.status) {
      case 0:
        return {
          success: false,
          error: 'Network error. Please check your connection and try again.',
        };
      // 400 — only /user/verify-account returns it (invalid / expired code).
      case 400:
        return {
          success: false,
          error: isVerification
            ? 'The verification code is invalid or has expired. Please request a new one.'
            : 'The request could not be processed. Please try again.',
        };
      // 401 — only /auth/local/login returns it. Backend text here is clean.
      case 401:
        return {
          success: false,
          error:
            backendMessage ||
            'Invalid email/username or password. If you just registered, please verify your email first.',
        };
      // 409 — only /user/register returns it (email or username taken).
      case 409:
        return {
          success: false,
          error: backendMessage || 'This email or username is already in use.',
        };
      // 422 — validation error. Backend text is a raw deserialization dump,
      // so always use a friendly, context-appropriate message instead.
      case 422:
        return {
          success: false,
          error: isVerification
            ? 'Please enter the complete 6-digit verification code.'
            : 'Invalid input. Please check your email, username, and password format.',
        };
      // 429 — every endpoint can rate-limit.
      case 429:
        return {
          success: false,
          error: 'Too many attempts. Please wait a moment and try again.',
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
