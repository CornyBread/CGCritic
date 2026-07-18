import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiResult } from '../models/api.model';
import {
  GameDetail,
  GameRef,
  Platform,
  PopularResponse,
  Review,
  SearchResponse,
  SubmitReview,
} from '../models/game.model';

export interface SearchOptions {
  q?: string;
  /** Comma-separated platform UUIDs. */
  platforms?: string;
  /** From a previous search response, to keep a paginated session consistent. */
  paginationId?: string | null;
  limit: number;
  offset: number;
}

@Injectable({ providedIn: 'root' })
export class GameService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.backendUrl;

  /** GET /game/popular — most popular games (IGDB, or internal fallback). */
  async getPopular(
    limit: number,
    offset: number,
  ): Promise<ApiResult<PopularResponse>> {
    try {
      const params = new HttpParams()
        .set('limit', limit)
        .set('offset', offset);
      const data = await firstValueFrom(
        this.http.get<PopularResponse>(`${this.base}/game/popular`, {
          params,
          withCredentials: true,
        }),
      );
      return { success: true, data };
    } catch (err) {
      return this.handleError(err);
    }
  }

  /** GET /game/search — paginated search. */
  async search(opts: SearchOptions): Promise<ApiResult<SearchResponse>> {
    try {
      let params = new HttpParams()
        .set('limit', opts.limit)
        .set('offset', opts.offset);
      if (opts.q) params = params.set('q', opts.q);
      if (opts.platforms) params = params.set('platforms', opts.platforms);
      if (opts.paginationId) params = params.set('paginationId', opts.paginationId);

      const data = await firstValueFrom(
        this.http.get<SearchResponse>(`${this.base}/game/search`, {
          params,
          withCredentials: true,
        }),
      );
      return { success: true, data };
    } catch (err) {
      return this.handleError(err);
    }
  }

  /** GET /game — full detail by internal id or external IGDB id. */
  async getGame(ref: GameRef): Promise<ApiResult<GameDetail>> {
    try {
      let params = new HttpParams();
      if (ref.id) {
        params = params.set('id', ref.id);
      } else if (ref.externalId != null) {
        params = params.set('externalId', ref.externalId);
      } else {
        return { success: false, error: 'No game reference provided.' };
      }

      const data = await firstValueFrom(
        this.http.get<GameDetail>(`${this.base}/game`, {
          params,
          withCredentials: true,
        }),
      );
      return { success: true, data };
    } catch (err) {
      return this.handleError(err, true);
    }
  }

  /** GET /platforms — all platforms in the internal database. */
  async getPlatforms(): Promise<ApiResult<Platform[]>> {
    try {
      const data = await firstValueFrom(
        this.http.get<Platform[]>(`${this.base}/platforms`, {
          withCredentials: true,
        }),
      );
      return { success: true, data };
    } catch (err) {
      return this.handleError(err);
    }
  }

  /** GET /game/{id}/reviews — all user and critic reviews for a game. */
  async getReviews(gameId: string): Promise<ApiResult<Review[]>> {
    try {
      const data = await firstValueFrom(
        this.http.get<{ reviews: Review[] }>(
          `${this.base}/game/${gameId}/reviews`,
          { withCredentials: true },
        ),
      );
      return { success: true, data: data.reviews ?? [] };
    } catch (err) {
      return this.handleError(err);
    }
  }

  /** POST /game/{id}/review — create or update the caller's review. */
  async submitReview(
    gameId: string,
    body: SubmitReview,
  ): Promise<ApiResult<Review>> {
    try {
      const data = await firstValueFrom(
        this.http.post<Review>(`${this.base}/game/${gameId}/review`, body, {
          withCredentials: true,
        }),
      );
      return { success: true, data };
    } catch (err) {
      return this.handleError(err);
    }
  }

  private handleError(err: unknown, hasNotFound = false): ApiResult<never> {
    if (!(err instanceof HttpErrorResponse) || err.status === 0) {
      return {
        success: false,
        error: 'Sin conexión. Revisa tu red e inténtalo de nuevo.',
      };
    }
    switch (err.status) {
      case 400:
        return { success: false, error: 'Solicitud inválida.' };
      case 401:
        return {
          success: false,
          error: 'Tu sesión expiró. Inicia sesión de nuevo.',
        };
      case 422:
        return {
          success: false,
          error: 'Revisa el título, el contenido y la puntuación (0–100).',
        };
      case 404:
        return {
          success: false,
          error: hasNotFound ? 'Juego no encontrado.' : 'No encontrado.',
        };
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
