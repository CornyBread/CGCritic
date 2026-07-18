import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonSpinner,
} from '@ionic/angular/standalone';

import { GameService } from '../../core/services/game.service';
import {
  GameDetail,
  GameRef,
  Review,
  igdbCover,
} from '../../core/models/game.model';

@Component({
  selector: 'app-game-detail',
  templateUrl: './game-detail.component.html',
  styleUrls: ['./game-detail.component.scss'],
  imports: [
    FormsModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonSpinner,
  ],
})
export class GameDetailComponent implements OnInit {
  /** Which game to load (by internal id or external IGDB id). */
  @Input({ required: true }) gameRef!: GameRef;
  /** Critics and admins may write reviews; everyone else is read-only. */
  @Input() canReview = false;
  /** The signed-in user's id, to flag and prefill their own review. */
  @Input() currentUserId: string | null = null;
  @Output() readonly close = new EventEmitter<void>();

  private readonly games = inject(GameService);

  readonly stars = [1, 2, 3, 4, 5];

  game: GameDetail | null = null;
  loading = true;
  error: string | null = null;
  imageError = false;
  summaryExpanded = false;

  // Reviews
  reviews: Review[] = [];
  reviewsLoading = false;
  reviewsError: string | null = null;

  // Review form (critics/admins)
  reviewTitle = '';
  reviewContent = '';
  reviewRating = 0;
  submitting = false;
  formError: string | null = null;
  editing = false;

  async ngOnInit(): Promise<void> {
    const res = await this.games.getGame(this.gameRef);
    if (res.success && res.data) {
      this.game = res.data;
      if (this.game.id) void this.loadReviews(this.game.id);
    } else {
      this.error = res.error ?? 'No se pudo cargar el juego.';
    }
    this.loading = false;
  }

  private async loadReviews(gameId: string): Promise<void> {
    this.reviewsLoading = true;
    this.reviewsError = null;
    const res = await this.games.getReviews(gameId);
    if (res.success && res.data) {
      this.reviews = res.data;
      this.prefillOwnReview();
    } else {
      this.reviewsError = res.error ?? 'No se pudieron cargar las reseñas.';
    }
    this.reviewsLoading = false;
  }

  /** If the user already reviewed this game, load it into the form to edit. */
  private prefillOwnReview(): void {
    if (!this.currentUserId) return;
    const own = this.reviews.find((r) => r.userId === this.currentUserId);
    if (own) {
      this.reviewTitle = own.title;
      this.reviewContent = own.content;
      this.reviewRating = own.rating;
      this.editing = true;
    }
  }

  get cover(): string | null {
    return igdbCover(this.game?.coverUrl, '720p');
  }

  get releaseYear(): string | null {
    const raw = this.game?.firstReleaseDate;
    if (!raw) return null;
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : String(d.getFullYear());
  }

  get developers(): string[] {
    return (this.game?.companies ?? [])
      .filter((c) => c.role?.toLowerCase() === 'developer')
      .map((c) => c.name);
  }

  get publishers(): string[] {
    return (this.game?.companies ?? [])
      .filter((c) => c.role?.toLowerCase() === 'publisher')
      .map((c) => c.name);
  }

  get otherCompanies(): string[] {
    return (this.game?.companies ?? [])
      .filter((c) => {
        const r = c.role?.toLowerCase();
        return r !== 'developer' && r !== 'publisher';
      })
      .map((c) => (c.role ? `${c.name} (${c.role})` : c.name));
  }

  round(value: number | null): number | null {
    return value == null ? null : Math.round(value);
  }

  isOwnReview(review: Review): boolean {
    return !!this.currentUserId && review.userId === this.currentUserId;
  }

  formatDate(iso: string): string {
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
      ? ''
      : d.toLocaleDateString(undefined, {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });
  }

  onImgError(): void {
    this.imageError = true;
  }

  setRating(value: number): void {
    this.reviewRating = value;
  }

  async submitReview(): Promise<void> {
    if (this.submitting || !this.game?.id) return;

    const title = this.reviewTitle.trim();
    const content = this.reviewContent.trim();
    if (title.length < 2) {
      this.formError = 'Ponle un título a tu reseña.';
      return;
    }
    if (content.length < 3) {
      this.formError = 'Escribe un poco más en tu reseña.';
      return;
    }
    if (this.reviewRating <= 0) {
      this.formError = 'Elige una puntuación.';
      return;
    }

    this.submitting = true;
    this.formError = null;
    const res = await this.games.submitReview(this.game.id, {
      title,
      content,
      rating: this.reviewRating,
    });
    this.submitting = false;

    if (res.success) {
      this.editing = true;
      await this.loadReviews(this.game.id);
    } else {
      this.formError = res.error ?? 'No se pudo publicar la reseña.';
    }
  }
}
