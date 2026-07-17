import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IonButton, IonIcon, IonSpinner } from '@ionic/angular/standalone';

import { SocialProvider } from '../../core/models/auth.model';

@Component({
  selector: 'app-social-auth',
  templateUrl: './social-auth.component.html',
  styleUrls: ['./social-auth.component.scss'],
  imports: [IonButton, IonIcon, IonSpinner],
})
export class SocialAuthComponent {
  @Input() loadingProvider: SocialProvider | null = null;
  @Input() disabled = false;
  @Output() auth = new EventEmitter<SocialProvider>();

  onAuth(provider: SocialProvider): void {
    this.auth.emit(provider);
  }
}
