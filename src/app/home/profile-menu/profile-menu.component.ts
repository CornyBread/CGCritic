import { Component, EventEmitter, OnInit, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonInput,
  IonButton,
  IonSpinner,
  IonIcon,
} from '@ionic/angular/standalone';

import { AuthService } from '../../core/services/auth.service';
import { UserService, UserProfile } from '../../core/services/user.service';

/** Which action is currently awaiting the backend (drives per-button spinners). */
type BusyAction = 'username' | 'email' | 'code' | 'critic' | 'delete' | null;

@Component({
  selector: 'app-profile-menu',
  templateUrl: './profile-menu.component.html',
  styleUrls: ['./profile-menu.component.scss'],
  imports: [FormsModule, IonInput, IonButton, IonSpinner, IonIcon],
})
export class ProfileMenuComponent implements OnInit {
  /** Emitted when the panel should be dismissed. */
  @Output() readonly close = new EventEmitter<void>();

  private readonly users = inject(UserService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  profile: UserProfile | null = null;
  loading = true;
  loadError = false;

  newUsername = '';
  newEmail = '';
  emailCode = '';
  /** True once change-email succeeds: we then collect the 6-digit code. */
  awaitingCode = false;
  confirmingDelete = false;

  busy: BusyAction = null;
  message: string | null = null;
  messageKind: 'ok' | 'err' = 'ok';

  async ngOnInit(): Promise<void> {
    const res = await this.users.getUserProfile();
    if (res.success && res.data) {
      this.profile = res.data;
    } else {
      this.loadError = true;
    }
    this.loading = false;
  }

  /** Primary role shown next to the username. */
  get role(): string {
    const roles = this.profile?.roles;
    return roles && roles.length ? roles[0] : 'User';
  }

  get isCritic(): boolean {
    return !!this.profile?.roles?.includes('Critic');
  }

  private ok(text: string): void {
    this.messageKind = 'ok';
    this.message = text;
  }

  private fail(text: string): void {
    this.messageKind = 'err';
    this.message = text;
  }

  // --- Username (PATCH /user/update-data) ----------------------------------
  async saveUsername(): Promise<void> {
    const username = this.newUsername.trim().toLowerCase();
    if (!/^[a-z0-9]+$/.test(username)) {
      this.fail('El usuario solo puede tener letras y números.');
      return;
    }
    this.busy = 'username';
    this.message = null;
    const res = await this.users.changeUsername(username);
    this.busy = null;
    if (res.success) {
      if (this.profile) this.profile.username = username;
      this.newUsername = '';
      this.ok('Nombre de usuario actualizado.');
    } else {
      this.fail(res.error ?? 'No se pudo actualizar el usuario.');
    }
  }

  // --- Email change (POST /user/change-email → verify-email-change) ---------
  async saveEmail(): Promise<void> {
    const email = this.newEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.fail('Ingresa un email válido.');
      return;
    }
    this.busy = 'email';
    this.message = null;
    const res = await this.users.changeEmail(email);
    this.busy = null;
    if (res.success) {
      this.awaitingCode = true;
      this.ok('Te enviamos un código de 6 dígitos al nuevo email.');
    } else {
      this.fail(res.error ?? 'No se pudo iniciar el cambio de email.');
    }
  }

  async verifyEmail(): Promise<void> {
    if (this.emailCode.trim().length !== 6) {
      this.fail('Ingresa el código de 6 dígitos.');
      return;
    }
    this.busy = 'code';
    this.message = null;
    const res = await this.users.verifyEmailChange(this.emailCode.trim());
    this.busy = null;
    if (res.success) {
      if (this.profile) this.profile.email = this.newEmail.trim();
      this.awaitingCode = false;
      this.emailCode = '';
      this.newEmail = '';
      this.ok('Email actualizado correctamente.');
    } else {
      this.fail(res.error ?? 'No se pudo verificar el código.');
    }
  }

  cancelEmailChange(): void {
    this.awaitingCode = false;
    this.emailCode = '';
    this.message = null;
  }

  // --- Critic application (POST /critic/apply) -----------------------------
  async becomeCritic(): Promise<void> {
    this.busy = 'critic';
    this.message = null;
    const res = await this.users.applyForCritic();
    this.busy = null;
    if (res.success) {
      this.ok('¡Solicitud enviada! Te avisaremos cuando sea revisada.');
    } else {
      this.fail(res.error ?? 'No se pudo enviar la solicitud.');
    }
  }

  // --- Delete account (DELETE /user) ---------------------------------------
  async deleteAccount(): Promise<void> {
    if (!this.confirmingDelete) {
      this.confirmingDelete = true;
      return;
    }
    this.busy = 'delete';
    this.message = null;
    const res = await this.users.deleteAccount();
    this.busy = null;
    if (res.success) {
      // Server already logged us out; clear the local session and leave.
      this.auth.setSession(false);
      this.close.emit();
      this.router.navigateByUrl('/login', { replaceUrl: true });
    } else {
      this.confirmingDelete = false;
      this.fail(res.error ?? 'No se pudo eliminar la cuenta.');
    }
  }

  cancelDelete(): void {
    this.confirmingDelete = false;
  }
}
