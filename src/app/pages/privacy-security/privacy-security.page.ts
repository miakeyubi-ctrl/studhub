import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { Capacitor } from '@capacitor/core';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { PushNotificationsService } from '../../services/push-notifications.service';
import { IncomingCallWake } from '../../plugins/incoming-call-wake';

const PRIVACY_PREFS_KEY = 'studhub-privacy-prefs-v1';

interface PrivacyPrefs {
  pushEnabled: boolean;
  personalizedTips: boolean;
}

interface PolicySection {
  title: string;
  body: string;
  open?: boolean;
}

@Component({
  selector: 'app-privacy-security',
  templateUrl: './privacy-security.page.html',
  styleUrls: ['./privacy-security.page.scss'],
  standalone: false,
})
export class PrivacySecurityPage implements OnInit {
  prefs: PrivacyPrefs = { pushEnabled: true, personalizedTips: true };
  email = '';
  deleting = false;
  sections: PolicySection[] = [
    { title: 'PRIVACY_PAGE.POL1_TITLE', body: 'PRIVACY_PAGE.POL1_BODY' },
    { title: 'PRIVACY_PAGE.POL2_TITLE', body: 'PRIVACY_PAGE.POL2_BODY' },
    { title: 'PRIVACY_PAGE.POL3_TITLE', body: 'PRIVACY_PAGE.POL3_BODY' },
    { title: 'PRIVACY_PAGE.POL4_TITLE', body: 'PRIVACY_PAGE.POL4_BODY' },
  ];

  constructor(
    private location: Location,
    private router: Router,
    private auth: AuthService,
    public theme: ThemeService,
    private push: PushNotificationsService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    this.email = this.auth.currentUser?.email || '';
    this.prefs = this.loadPrefs();
  }

  goBack(): void {
    if (window.history.length > 1) {
      this.location.back();
      return;
    }
    void this.router.navigateByUrl('/tabs/tab3');
  }

  toggleSection(s: PolicySection): void {
    s.open = !s.open;
  }

  async onPushToggle(checked: boolean): Promise<void> {
    this.prefs.pushEnabled = checked;
    this.savePrefs();
    if (checked) {
      try {
        await this.push.init();
        if (Capacitor.isNativePlatform()) {
          await IncomingCallWake.requestFullScreenPermission();
        }
      } catch {
        /* ignore */
      }
    }
    await this.toast(
      checked ? 'PRIVACY_PAGE.PUSH_ON' : 'PRIVACY_PAGE.PUSH_OFF',
    );
  }

  onTipsToggle(checked: boolean): void {
    this.prefs.personalizedTips = checked;
    this.savePrefs();
  }

  onDarkToggle(checked: boolean): void {
    if (checked !== this.theme.isDark) {
      this.theme.toggleTheme();
    }
  }

  goChangePassword(): void {
    void this.router.navigateByUrl('/forgot-password');
  }

  goEditProfile(): void {
    void this.router.navigateByUrl('/edit-profile');
  }

  async confirmLogout(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: this.translate.instant('PRIVACY_PAGE.LOGOUT_TITLE'),
      message: this.translate.instant('PRIVACY_PAGE.LOGOUT_MESSAGE'),
      buttons: [
        { text: this.translate.instant('COMMON.CANCEL'), role: 'cancel' },
        {
          text: this.translate.instant('PROFILE_PAGE.MENU_LOGOUT'),
          role: 'destructive',
          handler: () => {
            this.auth.logout();
            void this.router.navigateByUrl('/login', { replaceUrl: true });
          },
        },
      ],
    });
    await alert.present();
  }

  async confirmDeleteAccount(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: this.translate.instant('PRIVACY_PAGE.DELETE_TITLE'),
      message: this.translate.instant('PRIVACY_PAGE.DELETE_MESSAGE'),
      inputs: [
        {
          name: 'password',
          type: 'password',
          placeholder: this.translate.instant('AUTH.PASSWORD_PLACEHOLDER'),
        },
      ],
      buttons: [
        { text: this.translate.instant('COMMON.CANCEL'), role: 'cancel' },
        {
          text: this.translate.instant('PRIVACY_PAGE.DELETE_CONFIRM'),
          role: 'destructive',
          handler: (data) => {
            void this.runDelete(String(data?.password || ''));
          },
        },
      ],
    });
    await alert.present();
  }

  private async runDelete(password: string): Promise<void> {
    if (!password || password.length < 6) {
      await this.toast('PRIVACY_PAGE.DELETE_BAD_PASSWORD', 'danger');
      return;
    }
    this.deleting = true;
    try {
      const res = await this.auth.deleteAccount(password);
      if (!res.success) {
        await this.toast(res.message || 'PRIVACY_PAGE.DELETE_ERROR', 'danger');
        return;
      }
      await this.toast('PRIVACY_PAGE.DELETE_OK', 'success');
      void this.router.navigateByUrl('/login', { replaceUrl: true });
    } finally {
      this.deleting = false;
    }
  }

  private loadPrefs(): PrivacyPrefs {
    try {
      const raw = localStorage.getItem(PRIVACY_PREFS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          pushEnabled: parsed.pushEnabled !== false,
          personalizedTips: parsed.personalizedTips !== false,
        };
      }
    } catch {
      /* ignore */
    }
    return { pushEnabled: true, personalizedTips: true };
  }

  private savePrefs(): void {
    localStorage.setItem(PRIVACY_PREFS_KEY, JSON.stringify(this.prefs));
  }

  private async toast(key: string, color: 'success' | 'danger' = 'success'): Promise<void> {
    const t = await this.toastCtrl.create({
      message: this.translate.instant(key),
      duration: 2200,
      color,
      position: 'top',
    });
    await t.present();
  }
}
