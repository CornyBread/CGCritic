import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiResult } from '../models/api.model';

export interface CriticApplication {
  id: string;
  userId: string;
  username: string;
  email: string;
  status: string;
  appliedAt: string;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.backendUrl;

  /** GET /critic/applications — pending applications (admin only). */
  async getCriticApplications(): Promise<ApiResult<CriticApplication[]>> {
    try {
      const data = await firstValueFrom(
        this.http.get<CriticApplication[]>(`${this.base}/critic/applications`, {
          withCredentials: true,
        }),
      );
      return { success: true, data };
    } catch (err) {
      return this.handleError(err);
    }
  }

  /** POST /critic/applications/{id}/approve — grants the Critic role. */
  approve(id: string): Promise<ApiResult> {
    return this.review(id, 'approve');
  }

  /** POST /critic/applications/{id}/reject — rejects the application. */
  reject(id: string): Promise<ApiResult> {
    return this.review(id, 'reject');
  }

  private async review(
    id: string,
    action: 'approve' | 'reject',
  ): Promise<ApiResult> {
    try {
      await firstValueFrom(
        this.http.post(
          `${this.base}/critic/applications/${id}/${action}`,
          {},
          { withCredentials: true },
        ),
      );
      return { success: true };
    } catch (err) {
      return this.handleError(err);
    }
  }

  private handleError(err: unknown): ApiResult<never> {
    if (!(err instanceof HttpErrorResponse) || err.status === 0) {
      return { success: false, error: 'Sin conexión. Revisa tu red.' };
    }
    switch (err.status) {
      case 401:
        return { success: false, error: 'Tu sesión expiró. Inicia sesión de nuevo.' };
      case 403:
        return { success: false, error: 'Necesitas ser administrador.' };
      case 404:
        return { success: false, error: 'La solicitud ya no existe.' };
      case 409:
        return { success: false, error: 'Esta solicitud ya fue revisada.' };
      case 422:
        return { success: false, error: 'Solicitud inválida.' };
      case 500:
        return { success: false, error: 'Error del servidor. Inténtalo más tarde.' };
      default:
        return {
          success: false,
          error: `Dificultades técnicas (Error ${err.status}).`,
        };
    }
  }
}
