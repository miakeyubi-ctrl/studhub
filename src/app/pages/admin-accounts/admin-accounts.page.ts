import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { AdminAccount, AdminAccountsService } from '../../services/admin-accounts.service';

@Component({
  selector: 'app-admin-accounts',
  templateUrl: './admin-accounts.page.html',
  styleUrls: ['./admin-accounts.page.scss'],
  standalone: false,
})
export class AdminAccountsPage {
  loading = true;
  error = false;
  search = '';
  filterKind: 'all' | 'user' | 'agent' = 'all';
  accounts: AdminAccount[] = [];

  constructor(
    private router: Router,
    private accountsApi: AdminAccountsService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private translate: TranslateService,
  ) {}

  ionViewWillEnter(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.error = false;
    this.loading = true;
    try {
      this.accounts = await this.accountsApi.list(this.search, this.filterKind);
    } catch {
      this.error = true;
    } finally {
      this.loading = false;
    }
  }

  get filtered(): AdminAccount[] {
    const q = this.search.trim().toLowerCase();
    let list = this.accounts;
    if (this.filterKind !== 'all') {
      list = list.filter((a) => a.kind === this.filterKind);
    }
    if (!q) return list;
    return list.filter((a) =>
      [a.displayName, a.email, a.university || '', a.phone || '', a.role]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }

  get stats() {
    const all = this.accounts;
    return {
      total: all.length,
      students: all.filter((a) => a.kind === 'user' && a.role !== 'ADMIN').length,
      agents: all.filter((a) => a.kind === 'agent').length,
      blocked: all.filter((a) => a.isBlocked).length,
    };
  }

  goBack(): void {
    void this.router.navigateByUrl('/admin');
  }

  setFilter(kind: 'all' | 'user' | 'agent'): void {
    this.filterKind = kind;
  }

  formatDate(value?: string | null): string {
    if (!value) return '—';
    try {
      return new Date(value).toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return String(value);
    }
  }

  kindLabel(a: AdminAccount): string {
    if (a.role === 'ADMIN') return 'ADMIN_ACCOUNTS.KIND_ADMIN';
    return a.kind === 'agent' ? 'ADMIN_ACCOUNTS.KIND_AGENT' : 'ADMIN_ACCOUNTS.KIND_STUDENT';
  }

  async confirmToggle(a: AdminAccount, event: Event): Promise<void> {
    event.stopPropagation();
    if (a.role === 'ADMIN') {
      await this.showToast('ADMIN_ACCOUNTS.CANNOT_BLOCK_ADMIN', 'warning');
      return;
    }
    const nextBlocked = !a.isBlocked;
    const alert = await this.alertCtrl.create({
      header: this.translate.instant(
        nextBlocked ? 'ADMIN_ACCOUNTS.CONFIRM_BLOCK_TITLE' : 'ADMIN_ACCOUNTS.CONFIRM_UNBLOCK_TITLE',
      ),
      message: `${a.displayName} (${a.email})`,
      buttons: [
        { text: this.translate.instant('COMMON.CANCEL'), role: 'cancel' },
        {
          text: this.translate.instant(
            nextBlocked ? 'ADMIN_ACCOUNTS.BLOCK' : 'ADMIN_ACCOUNTS.UNBLOCK',
          ),
          role: nextBlocked ? 'destructive' : undefined,
          handler: () => {
            void this.toggle(a, nextBlocked);
          },
        },
      ],
    });
    await alert.present();
  }

  private async toggle(a: AdminAccount, blocked: boolean): Promise<void> {
    try {
      await this.accountsApi.setBlocked(a.kind, a.id, blocked);
      a.isBlocked = blocked;
      a.blockedAt = blocked ? new Date().toISOString() : null;
      a.updatedAt = new Date().toISOString();
      await this.showToast(
        blocked ? 'ADMIN_ACCOUNTS.BLOCKED_OK' : 'ADMIN_ACCOUNTS.UNBLOCKED_OK',
        'success',
      );
    } catch {
      await this.showToast('ADMIN_ACCOUNTS.ERROR', 'danger');
    }
  }

  private async showToast(key: string, color: 'success' | 'danger' | 'warning'): Promise<void> {
    const t = await this.toastCtrl.create({
      message: this.translate.instant(key),
      duration: 2200,
      color,
      position: 'top',
    });
    await t.present();
  }
}
