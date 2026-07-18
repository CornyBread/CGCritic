import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';

import { GameSummary, igdbCover } from '../../core/models/game.model';

/**
 * Presentational game card. Fully decoupled: it only knows a GameSummary and
 * emits `open`. The cover always fills a fixed 3:4 box (object-fit: cover) and
 * the title clamps to two lines, so odd image sizes or long names can't break
 * the layout.
 */
@Component({
  selector: 'app-game-card',
  templateUrl: './game-card.component.html',
  styleUrls: ['./game-card.component.scss'],
  imports: [IonIcon],
})
export class GameCardComponent {
  @Input({ required: true }) game!: GameSummary;
  @Output() readonly open = new EventEmitter<GameSummary>();

  imageError = false;

  get cover(): string | null {
    return igdbCover(this.game?.coverUrl, 'cover_big');
  }

  onImgError(): void {
    this.imageError = true;
  }
}
