import { Component, EventEmitter, OnInit, Output, inject } from '@angular/core';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonSpinner,
} from '@ionic/angular/standalone';

import { AdminService, CriticApplication } from '../../core/services/admin.service';

@Component({
  selector: 'app-admin-panel',
  templateUrl: './admin-panel.component.html',
  styleUrls: ['./admin-panel.component.scss'],
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonSpinner,
  ],
})
export class AdminPanelComponent implements OnInit {
  @Output() readonly close = new EventEmitter<void>();

  private readonly admin = inject(AdminService);

  apps: CriticApplication[] = [];
  loading = true;
  error: string | null = null;

  busyId: string | null = null;
  busyAction: 'approve' | 'reject' | null = null;
  actionError: string | null = null;

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading = true;
    this.error = null;
    const res = await this.admin.getCriticApplications();
    if (res.success && res.data) {
      this.apps = res.data;
    } else {
      this.error = res.error ?? 'No se pudieron cargar las solicitudes.';
    }
    this.loading = false;
  }

  approve(app: CriticApplication): void {
    void this.review(app, 'approve');
  }

  reject(app: CriticApplication): void {
    void this.review(app, 'reject');
  }

  private async review(
    app: CriticApplication,
    action: 'approve' | 'reject',
  ): Promise<void> {
    if (this.busyId) return;
    this.busyId = app.id;
    this.busyAction = action;
    this.actionError = null;

    const res =
      action === 'approve'
        ? await this.admin.approve(app.id)
        : await this.admin.reject(app.id);

    if (res.success) {
      // Remove the resolved application from the list.
      this.apps = this.apps.filter((a) => a.id !== app.id);
    } else {
      this.actionError = res.error ?? 'No se pudo procesar la solicitud.';
      // If it was already reviewed elsewhere, drop it so the list stays fresh.
      if (res.error?.includes('revisada') || res.error?.includes('existe')) {
        this.apps = this.apps.filter((a) => a.id !== app.id);
      }
    }

    this.busyId = null;
    this.busyAction = null;
  }

  initials(username: string): string {
    return (username || '?').slice(0, 2).toUpperCase();
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
}
