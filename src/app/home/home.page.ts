import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonButton,
  IonIcon,
  IonModal,
  IonSearchbar,
  IonSpinner,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  InfiniteScrollCustomEvent,
} from '@ionic/angular/standalone';

import { AuthService } from '../core/services/auth.service';
import { UserService } from '../core/services/user.service';
import { GameService } from '../core/services/game.service';
import {
  GameSummary,
  GameRef,
  Platform,
  dedupeGames,
  gameKey,
} from '../core/models/game.model';
import { ProfileMenuComponent } from './profile-menu/profile-menu.component';
import { GameCardComponent } from './game-card/game-card.component';
import { GameDetailComponent } from './game-detail/game-detail.component';
import { AdminPanelComponent } from './admin-panel/admin-panel.component';

const PAGE_SIZE = 18;

/** Platforms featured as rows on the home (matched by name, order kept). */
const FEATURED_PLATFORMS = ['PlayStation 5', 'Xbox Series X|S', 'Nintendo Switch'];

interface PlatformRow {
  platform: Platform;
  games: GameSummary[];
  offset: number;
  total: number;
  loading: boolean;
}

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  imports: [
    IonContent,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonButton,
    IonIcon,
    IonModal,
    IonSearchbar,
    IonSpinner,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    ProfileMenuComponent,
    GameCardComponent,
    GameDetailComponent,
    AdminPanelComponent,
  ],
})
export class HomePage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly users = inject(UserService);
  private readonly games = inject(GameService);
  private readonly router = inject(Router);

  readonly trackGame = gameKey;

  // Profile / avatar
  profileOpen = false;
  isCritic = false;
  isAdmin = false;
  adminOpen = false;
  userId: string | null = null;
  private username = '';

  // Popular
  popular: GameSummary[] = [];
  private popularOffset = 0;
  private popularTotal = Infinity;
  popularLoading = false;
  popularError = false;

  // Platform rows ("Para PlayStation 5", …)
  platformRows: PlatformRow[] = [];

  // Search
  searchQuery = '';
  searchResults: GameSummary[] = [];
  private searchOffset = 0;
  private searchTotal = Infinity;
  private searchPaginationId: string | null = null;
  searchLoading = false;
  searchError: string | null = null;
  /** Incremented per query so a stale in-flight response can be discarded. */
  private searchToken = 0;

  // Detail modal
  detailOpen = false;
  selectedRef: GameRef | null = null;

  async ngOnInit(): Promise<void> {
    void this.loadProfile();
    void this.loadPopular();
    void this.loadPlatformRows();
  }

  get initials(): string {
    const name = this.username.trim();
    return name ? name.slice(0, 2).toUpperCase() : 'CG';
  }

  get searching(): boolean {
    return this.searchQuery.trim().length > 0;
  }

  get popularHasMore(): boolean {
    return this.popular.length < this.popularTotal;
  }

  private async loadProfile(): Promise<void> {
    const res = await this.users.getUserProfile();
    if (res.success && res.data) {
      const roles = res.data.roles ?? [];
      this.username = res.data.username;
      this.userId = res.data.id;
      this.isCritic = roles.includes('Critic');
      this.isAdmin = roles.includes('Admin') || roles.includes('Owner');
    }
  }

  openAdmin(): void {
    this.adminOpen = true;
  }

  closeAdmin(): void {
    this.adminOpen = false;
  }

  // ---- Popular -------------------------------------------------------------
  async loadPopular(): Promise<void> {
    if (this.popularLoading || !this.popularHasMore) return;
    this.popularLoading = true;
    this.popularError = false;

    const res = await this.games.getPopular(PAGE_SIZE, this.popularOffset);
    if (res.success && res.data) {
      this.popular = dedupeGames([...this.popular, ...res.data.games]);
      this.popularTotal = res.data.meta.totalCount;
      this.popularOffset += PAGE_SIZE;
    } else if (this.popular.length === 0) {
      this.popularError = true;
    }
    this.popularLoading = false;
  }

  onPopularScroll(ev: Event): void {
    const el = ev.target as HTMLElement;
    if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 240) {
      void this.loadPopular();
    }
  }

  // ---- Platform rows -------------------------------------------------------
  private async loadPlatformRows(): Promise<void> {
    const res = await this.games.getPlatforms();
    if (!res.success || !res.data) return;

    const byName = new Map(res.data.map((p) => [p.name, p]));
    const chosen: Platform[] = [];
    for (const name of FEATURED_PLATFORMS) {
      const p = byName.get(name);
      if (p) chosen.push(p);
    }
    // Fill up to 3 if any featured name wasn't found in the database.
    for (const p of res.data) {
      if (chosen.length >= 3) break;
      if (!chosen.includes(p)) chosen.push(p);
    }

    this.platformRows = chosen.slice(0, 3).map((platform) => ({
      platform,
      games: [],
      offset: 0,
      total: Infinity,
      loading: false,
    }));

    for (const row of this.platformRows) void this.loadPlatformRow(row);
  }

  async loadPlatformRow(row: PlatformRow): Promise<void> {
    if (row.loading || row.games.length >= row.total) return;
    row.loading = true;

    const res = await this.games.search({
      platforms: row.platform.id,
      limit: PAGE_SIZE,
      offset: row.offset,
    });
    if (res.success && res.data) {
      row.games = dedupeGames([...row.games, ...res.data.games]);
      row.total = res.data.meta.totalCount;
      row.offset += PAGE_SIZE;
    } else {
      // Stop retrying this row on error.
      row.total = row.games.length;
    }
    row.loading = false;
  }

  onPlatformScroll(ev: Event, row: PlatformRow): void {
    const el = ev.target as HTMLElement;
    if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 240) {
      void this.loadPlatformRow(row);
    }
  }

  readonly trackPlatform = (_: number, row: PlatformRow): string =>
    row.platform.id;

  // ---- Search --------------------------------------------------------------
  onSearchInput(ev: Event): void {
    const value = (ev as CustomEvent<{ value?: string }>).detail?.value ?? '';
    this.applyQuery(value.trim());
  }

  private applyQuery(q: string): void {
    this.searchQuery = q;
    this.searchResults = [];
    this.searchOffset = 0;
    this.searchTotal = Infinity;
    this.searchPaginationId = null;
    this.searchError = null;
    this.searchToken++;

    if (q) void this.loadSearch();
  }

  private async loadSearch(): Promise<void> {
    if (this.searchLoading || this.searchResults.length >= this.searchTotal) return;
    this.searchLoading = true;
    const token = this.searchToken;

    const res = await this.games.search({
      q: this.searchQuery,
      paginationId: this.searchPaginationId,
      limit: PAGE_SIZE,
      offset: this.searchOffset,
    });

    // A newer query started while this was in flight — drop the result.
    if (token !== this.searchToken) return;

    if (res.success && res.data) {
      this.searchResults = dedupeGames([...this.searchResults, ...res.data.games]);
      this.searchTotal = res.data.meta.totalCount;
      this.searchPaginationId = res.data.meta.paginationId ?? this.searchPaginationId;
      this.searchOffset += PAGE_SIZE;
    } else if (this.searchResults.length === 0) {
      this.searchError = res.error ?? 'No se pudo buscar.';
    }
    this.searchLoading = false;
  }

  async onSearchInfinite(ev: InfiniteScrollCustomEvent): Promise<void> {
    await this.loadSearch();
    await ev.target.complete();
  }

  get searchHasMore(): boolean {
    return this.searchResults.length < this.searchTotal;
  }

  // ---- Detail --------------------------------------------------------------
  openGame(game: GameSummary): void {
    this.selectedRef = { id: game.id, externalId: game.externalId };
    this.detailOpen = true;
  }

  closeDetail(): void {
    this.detailOpen = false;
    this.selectedRef = null;
  }

  // ---- Profile / session ---------------------------------------------------
  openProfile(): void {
    this.profileOpen = true;
  }

  closeProfile(): void {
    this.profileOpen = false;
  }

  async logout(): Promise<void> {
    await this.users.logout();
    this.auth.setSession(false);
    this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}
