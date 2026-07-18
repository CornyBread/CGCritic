export interface GameSummary {
  id: string | null;
  externalId: number | null;
  name: string;
  coverUrl: string | null;
}

export interface Company {
  id: string;
  externalId: number | null;
  name: string;
  role: string;
}

export interface Genre {
  id: string;
  externalId: number | null;
  name: string;
}

export interface Platform {
  id: string;
  externalId: number | null;
  name: string;
  generation: number | null;
}

export interface GameDetail extends GameSummary {
  firstReleaseDate: string | null;
  rating: number | null;
  criticRating: number | null;
  totalRatingCount: number | null;
  summary: string | null;
  platforms: Platform[];
  genres: Genre[];
  companies: Company[];
}

export interface PopularResponse {
  games: GameSummary[];
  meta: { fromInternal: boolean; totalCount: number };
}

export interface SearchResponse {
  games: GameSummary[];
  meta: { paginationId: string | null; totalCount: number };
}

/** A game is fetched by internal UUID when known, else by external IGDB id. */
export interface GameRef {
  id?: string | null;
  externalId?: number | null;
}

export interface Review {
  id: string;
  gameId: string;
  userId: string;
  title: string;
  content: string;
  rating: number; // 0–100
  reviewType: string; // 'critic' | 'user'
  createdAt: string;
  updatedAt: string;
}

export interface SubmitReview {
  title: string;
  content: string;
  rating: number; // 0–100
}

type IgdbSize = 'cover_small' | 'cover_big' | '720p' | '1080p';

/**
 * IGDB serves covers at the tiny `t_thumb` size. Swap the size token to get a
 * crisper image. Returns null unchanged so callers can show a placeholder.
 */
export function igdbCover(
  url: string | null | undefined,
  size: IgdbSize = 'cover_big',
): string | null {
  if (!url) return null;
  const upgraded = url.replace('/t_thumb/', `/t_${size}/`);
  // IGDB sometimes returns protocol-relative URLs.
  return upgraded.startsWith('//') ? `https:${upgraded}` : upgraded;
}

/** A stable key for @for tracking (external id is unique; id as fallback). */
export function gameKey(game: GameSummary): string {
  return game.externalId != null ? `e${game.externalId}` : `i${game.id ?? game.name}`;
}

/**
 * The API can return the same game twice — once as an internal DB record and
 * once as an external IGDB result (same externalId, but id: null). Collapse
 * those to a single entry, preferring the internal record (it carries a real
 * id, so detail/reviews load reliably). Insertion order is preserved.
 */
export function dedupeGames(games: GameSummary[]): GameSummary[] {
  const byKey = new Map<string, GameSummary>();
  for (const game of games) {
    const key = gameKey(game);
    const existing = byKey.get(key);
    if (!existing || (!existing.id && game.id)) {
      byKey.set(key, game);
    }
  }
  return [...byKey.values()];
}
