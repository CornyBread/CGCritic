import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  isActive: boolean;
  roles: string[];
}

/** Uniform result so the UI can react without try/catch and show messages. */
export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

/** Identifies the calling endpoint so errors map to the right message. */
type ErrorContext =
  | 'profile'
  | 'change-email'
  | 'verify-email'
  | 'update-data'
  | 'delete'
  | 'critic'
  | 'logout';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly backendUrl = environment.backendUrl;

  /** GET /user — the authenticated user's profile. */
  async getUserProfile(): Promise<ActionResult<UserProfile>> {
    try {
      const data = await firstValueFrom(
        this.http.get<UserProfile>(`${this.backendUrl}/user`, {
          withCredentials: true,
        }),
      );
      return { success: true, data };
    } catch (err) {
      return this.handleError(err, 'profile');
    }
  }

  /** POST /user/change-email — sends a 6-digit code to the new address. */
  async changeEmail(newEmail: string): Promise<ActionResult> {
    try {
      await firstValueFrom(
        this.http.post(
          `${this.backendUrl}/user/change-email`,
          { new_email: newEmail },
          { withCredentials: true },
        ),
      );
      return { success: true };
    } catch (err) {
      return this.handleError(err, 'change-email');
    }
  }

  /** POST /user/verify-email-change — confirms the change with the code. */
  async verifyEmailChange(code: string): Promise<ActionResult> {
    try {
      await firstValueFrom(
        this.http.post(
          `${this.backendUrl}/user/verify-email-change`,
          { code },
          { withCredentials: true },
        ),
      );
      return { success: true };
    } catch (err) {
      return this.handleError(err, 'verify-email');
    }
  }

  /** PATCH /user/update-data — updates the username. */
  async changeUsername(newUsername: string): Promise<ActionResult> {
    try {
      await firstValueFrom(
        this.http.patch(
          `${this.backendUrl}/user/update-data`,
          { new_username: newUsername },
          { withCredentials: true },
        ),
      );
      return { success: true };
    } catch (err) {
      return this.handleError(err, 'update-data');
    }
  }

  /** DELETE /user — deletes the account and logs out server-side. */
  async deleteAccount(): Promise<ActionResult> {
    try {
      await firstValueFrom(
        this.http.delete(`${this.backendUrl}/user`, { withCredentials: true }),
      );
      return { success: true };
    } catch (err) {
      return this.handleError(err, 'delete');
    }
  }

  /** POST /critic/apply — a BasicUser applies to become a Critic. */
  async applyForCritic(): Promise<ActionResult<{ application_id: string }>> {
    try {
      const data = await firstValueFrom(
        this.http.post<{ application_id: string; message: string }>(
          `${this.backendUrl}/critic/apply`,
          {},
          { withCredentials: true },
        ),
      );
      return { success: true, data };
    } catch (err) {
      return this.handleError(err, 'critic');
    }
  }

  /** POST /auth/logout — clears the server session. */
  async logout(): Promise<ActionResult> {
    try {
      await firstValueFrom(
        this.http.post(
          `${this.backendUrl}/auth/logout`,
          {},
          { withCredentials: true },
        ),
      );
      return { success: true };
    } catch (err) {
      return this.handleError(err, 'logout');
    }
  }

  /**
   * Maps each endpoint's documented status codes to a friendly message.
   * 422 bodies carry raw deserialization text, so they are never surfaced.
   */
  private handleError(err: unknown, context: ErrorContext): ActionResult<never> {
    if (!(err instanceof HttpErrorResponse) || err.status === 0) {
      return {
        success: false,
        error: 'Network error. Please check your connection and try again.',
      };
    }

    const backend = err.error?.message || err.error?.error || '';

    switch (err.status) {
      // 400 — only the email-change flow returns it.
      case 400:
        if (context === 'verify-email') {
          return {
            success: false,
            error: 'The code is invalid or has expired. Please request a new one.',
          };
        }
        if (context === 'change-email') {
          return {
            success: false,
            error:
              'Email changes are only available for accounts created with an email and password.',
          };
        }
        return {
          success: false,
          error: backend || 'The request could not be processed.',
        };
      // 401 — session missing/expired on any authenticated route.
      case 401:
        return {
          success: false,
          error: 'Your session has expired. Please sign in again.',
        };
      // 403 — only /critic/apply returns it (must be a BasicUser).
      case 403:
        return {
          success: false,
          error: 'Only basic users can apply to become a critic.',
        };
      // 409 — conflict; message depends on which resource collided.
      case 409:
        if (context === 'change-email' || context === 'verify-email') {
          return { success: false, error: 'That email address is already in use.' };
        }
        if (context === 'update-data') {
          return { success: false, error: 'That username is already taken.' };
        }
        if (context === 'critic') {
          return {
            success: false,
            error: 'You have already applied to become a critic.',
          };
        }
        return { success: false, error: backend || 'Conflict with existing data.' };
      // 422 — validation. Use a friendly, context-specific message.
      case 422:
        return { success: false, error: this.validationMessage(context) };
      case 500:
        return { success: false, error: 'Server error. Please try again later.' };
      default:
        return {
          success: false,
          error: backend || `Technical difficulties (Error ${err.status}).`,
        };
    }
  }

  private validationMessage(context: ErrorContext): string {
    switch (context) {
      case 'change-email':
        return 'Please enter a valid email address.';
      case 'verify-email':
        return 'Please enter the complete 6-digit code.';
      case 'update-data':
        return 'Username may only contain letters and numbers.';
      default:
        return 'Invalid input. Please check your data and try again.';
    }
  }
}
