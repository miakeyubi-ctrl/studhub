import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

interface FaqItem {
  q: string;
  a: string;
  open?: boolean;
}

@Component({
  selector: 'app-help-support',
  templateUrl: './help-support.page.html',
  styleUrls: ['./help-support.page.scss'],
  standalone: false,
})
export class HelpSupportPage {
  faqs: FaqItem[] = [
    { q: 'HELP_PAGE.FAQ1_Q', a: 'HELP_PAGE.FAQ1_A' },
    { q: 'HELP_PAGE.FAQ2_Q', a: 'HELP_PAGE.FAQ2_A' },
    { q: 'HELP_PAGE.FAQ3_Q', a: 'HELP_PAGE.FAQ3_A' },
    { q: 'HELP_PAGE.FAQ4_Q', a: 'HELP_PAGE.FAQ4_A' },
    { q: 'HELP_PAGE.FAQ5_Q', a: 'HELP_PAGE.FAQ5_A' },
  ];

  subject = '';
  message = '';
  sending = false;

  readonly supportEmail = 'support@studhub.tn';
  readonly whatsappNumber = '21620000000';

  constructor(
    private location: Location,
    private router: Router,
    private http: HttpClient,
    private toastCtrl: ToastController,
    private translate: TranslateService,
  ) {}

  goBack(): void {
    if (window.history.length > 1) {
      this.location.back();
      return;
    }
    void this.router.navigateByUrl('/tabs/tab3');
  }

  toggleFaq(item: FaqItem): void {
    item.open = !item.open;
  }

  openEmail(): void {
    window.open(`mailto:${this.supportEmail}?subject=StudHub%20Support`, '_blank');
  }

  openWhatsApp(): void {
    window.open(`https://wa.me/${this.whatsappNumber}`, '_blank');
  }

  async sendMessage(): Promise<void> {
    const subj = this.subject.trim();
    const msg = this.message.trim();
    if (!subj || !msg) {
      await this.toast('HELP_PAGE.ERROR_REQUIRED', 'danger');
      return;
    }

    this.sending = true;
    try {
      const res: any = await firstValueFrom(
        this.http.post(`${environment.apiUrl}/support/contact`, {
          subject: subj,
          message: msg,
        }),
      );
      const ok = res?.success !== false && (res?.data?.sent !== false);
      if (!ok && res?.sent === false) {
        throw new Error(res?.message || 'send failed');
      }
      await this.toast('HELP_PAGE.SEND_SUCCESS', 'success');
      this.subject = '';
      this.message = '';
    } catch (e: any) {
      const apiMsg =
        e?.error?.message ||
        e?.error?.data?.message ||
        (typeof e?.message === 'string' ? e.message : '');
      // Fallback mailto si le serveur mail n'est pas configuré
      if (String(apiMsg).toLowerCase().includes('envoyer') || e?.status === 503) {
        const body = encodeURIComponent(msg);
        const subject = encodeURIComponent(`[StudHub] ${subj}`);
        window.open(`mailto:${this.supportEmail}?subject=${subject}&body=${body}`, '_blank');
        await this.toast('HELP_PAGE.SEND_HINT', 'warning');
      } else {
        await this.toastRaw(
          apiMsg || this.translate.instant('HELP_PAGE.SEND_FAILED'),
          'danger',
        );
      }
    } finally {
      this.sending = false;
    }
  }

  private async toast(key: string, color: 'success' | 'danger' | 'warning'): Promise<void> {
    const t = await this.toastCtrl.create({
      message: this.translate.instant(key),
      duration: 2500,
      color,
      position: 'top',
    });
    await t.present();
  }

  private async toastRaw(text: string, color: 'success' | 'danger' | 'warning'): Promise<void> {
    const t = await this.toastCtrl.create({
      message: text,
      duration: 2800,
      color,
      position: 'top',
    });
    await t.present();
  }
}
