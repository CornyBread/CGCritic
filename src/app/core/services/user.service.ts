import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  isActive: boolean;
  roles: string[];
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly backendUrl = environment.backendUrl;

  getUserProfile(): Promise<UserProfile> {
    return firstValueFrom(
      this.http.get<UserProfile>(`${this.backendUrl}/user`, {
        withCredentials: true,
      }),
    );
  }

  changeUserEmail(newEmail: string): Promise<unknown> {
    return firstValueFrom(
      this.http.post(
        `${this.backendUrl}/user/change-email`,
        { new_email: newEmail },
        { withCredentials: true },
      ),
    );
  }

  verifyEmailChange(code: string): Promise<unknown> {
    return firstValueFrom(
      this.http.post(
        `${this.backendUrl}/user/verify-email-change`,
        { code },
        { withCredentials: true },
      ),
    );
  }

  changeUsername(newUsername: string): Promise<unknown> {
    return firstValueFrom(
      this.http.patch(
        `${this.backendUrl}/user/update-data`,
        { new_username: newUsername },
        { withCredentials: true },
      ),
    );
  }

  deleteUserAccount(): Promise<unknown> {
    return firstValueFrom(
      this.http.delete(`${this.backendUrl}/user`, { withCredentials: true }),
    );
  }

  logoutUser(): Promise<unknown> {
    return firstValueFrom(
      this.http.post(
        `${this.backendUrl}/auth/logout`,
        {},
        { withCredentials: true },
      ),
    );
  }
}
