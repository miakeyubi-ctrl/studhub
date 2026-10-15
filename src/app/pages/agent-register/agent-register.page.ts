import { Component, OnInit, OnDestroy } from '@angular/core';
import { App } from '@capacitor/app';
import { Capacitor, PluginListenerHandle } from '@capacitor/core';
import { ThemeService } from '../../services/theme.service';
import { AgentAuthService } from '../../services/agent-auth.service';
import { RegisterDraftService } from '../../services/register-draft.service';
import { Router } from '@angular/router';
import { ToastController, LoadingController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { TUNISIA_CITIES } from '../../data/cities';
import {
  AGENT_ACTIVITY_TYPES,
  AgentActivityTypeValue,
} from '../../data/activity-types';

type Step = 1 | 2 | 3;

@Component({
  selector: 'app-agent-register',
  templateUrl: './agent-register.page.html',
  styleUrls: ['./agent-register.page.scss'],
  standalone: false,
})
export class AgentRegisterPage implements OnInit, OnDestroy {

  firstName = '';
  lastName = '';
  agencyName = '';
  email = '';
  phone = '';
  activityType: AgentActivityTypeValue | '' = '';
  activityCity = '';
  password = '';
  confirmPassword = '';
  acceptTerms = false;
  showPassword = false;

  activityTypes = AGENT_ACTIVITY_TYPES;
  cities = TUNISIA_CITIES;

  // — OTP register flow —
  step: Step = 1;
  otp = ['', '', '', '', '', ''];
  sendingOtp = false;
  verifyingOtp = false;
  otpSentEmail = '';
  otpSentAt: number | null = null;
  otpExpiresInSec = 600;
  otpResendCooldownSec = 45;
  private otpExpireAt: number | null = null;
  private otpResendAt: number | null = null;
  devLastOtpCode: string | undefined = undefined;
  private countdownTimer: any = null;
  countdownResendSec = 0;
  countdownExpireSec = 0;

  private loading?: HTMLIonLoadingElement;
  private appPauseHandle?: PluginListenerHandle;
  private onVisibility = () => {
    if (typeof document === 'undefined') return;
    if (document.hidden) {
      this.persistDraft();
    } else {
      this.restoreDraft();
    }
  };

  constructor(
    public theme: ThemeService,
    private agentAuth: AgentAuthService,
    private drafts: RegisterDraftService,
    private router: Router,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
    private translate: TranslateService,
  ) { }

  ngOnInit() {
    this.restoreDraft();
    this.startTimers();
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.onVisibility);
    }
    if (Capacitor.isNativePlatform()) {
      void App.addListener('appStateChange', ({ isActive }) => {
        if (!isActive) this.persistDraft();
        else this.restoreDraft();
      }).then((h) => {
        this.appPauseHandle = h;
      }).catch(() => undefined);
    }
  }

  ionViewWillEnter(): void {
    this.restoreDraft();
  }

  ngOnDestroy() {
    this.stopTimers();
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.onVisibility);
    }
    void this.appPauseHandle?.remove();
    this.persistDraft();
  }

  private startTimers() {
    this.countdownTimer = setInterval(() => {
      this.syncCountdownsFromDeadlines();
    }, 1000);
  }

  private stopTimers() {
    if (this.countdownTimer) { clearInterval(this.countdownTimer); this.countdownTimer = null; }
  }

  goBack() {
    if (this.step === 2 || this.step === 3) {
      this.step = 1;
      this.otp = ['', '', '', '', '', ''];
      this.persistDraft();
      return;
    }
    window.history.back();
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  get needsAgencyName(): boolean {
    return this.activityType === 'AGENT_IMMOBILIER';
  }

  get activityTypeLabel(): string {
    const opt = this.activityTypes.find((t) => t.value === this.activityType);
    return opt ? this.translate.instant(opt.labelKey) : '';
  }

  async goStudentRegister() {
    this.router.navigateByUrl('/register', { replaceUrl: true });
  }

  async goAgentRegister() {
    this.router.navigateByUrl('/agent-register', { replaceUrl: true });
  }

  /* ============ Étape 1 : valider infos agent puis envoi OTP ============ */

  canGoStep2(): boolean {
    if (this.firstName.trim().length < 2) return false;
    if (this.lastName.trim().length < 2) return false;
    if (this.needsAgencyName && !this.agencyName.trim()) return false;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim())) return false;
    if (!this.phone.trim()) return false;
    if (!this.activityType) return false;
    if (!this.activityCity.trim()) return false;
    if (!this.password || this.password.length < 6) return false;
    if (this.password !== this.confirmPassword) return false;
    if (!this.acceptTerms) return false;
    return true;
  }

  async goStep2SendOtp() {
    if (!this.canGoStep2()) {
      if (!this.acceptTerms) {
        await this.toast('AUTH.ERROR_ACCEPT_TERMS', 'warning');
      } else if (this.password !== this.confirmPassword) {
        await this.toast('AUTH.ERROR_PASSWORD_MISMATCH', 'warning');
      } else {
        await this.toast('AUTH.FILL_ALL_FIELDS', 'warning');
      }
      return;
    }
    this.sendingOtp = true;
    try {
      const res = await this.agentAuth.sendRegisterOtp(this.email.trim());
      if (res.sent) {
        this.otpSentEmail = res.email;
        this.otpSentAt = Date.now();
        this.otpExpiresInSec = Number(res.expiresInSec || 600);
        this.otpExpireAt = Date.now() + this.otpExpiresInSec * 1000;
        this.otpResendAt = Date.now() + this.otpResendCooldownSec * 1000;
        this.syncCountdownsFromDeadlines();
        this.devLastOtpCode = res.devCode;
        this.otp = ['', '', '', '', '', ''];
        this.step = 2;
        this.persistDraft();
        const msg = this.devLastOtpCode
          ? this.translate.instant('AUTH.CODE_SENT_DEV', { code: this.devLastOtpCode })
          : this.translate.instant('AUTH.OTP_SENT_EMAIL');
        await this.toastRaw(msg, 'success');
      } else {
        await this.toast('AUTH.OTP_FAILED', 'danger');
      }
    } catch (e: any) {
      const msg = e && e.message ? String(e.message) : 'AUTH.NETWORK_ERROR';
      await this.toast(msg, 'danger');
    } finally {
      this.sendingOtp = false;
    }
  }

  async resendOtp() {
    if (this.countdownResendSec > 0) return;
    await this.goStep2SendOtp();
  }

  get canResend(): boolean { return this.countdownResendSec <= 0 && this.step === 2; }

  get remainingExpireSecFmt(): string {
    const s = Math.max(0, this.countdownExpireSec);
    const mm = Math.floor(s / 60).toString().padStart(2, '0');
    const ss = (s % 60).toString().padStart(2, '0');
    return `${mm}:${ss}`;
  }

  /* ============ Étape 2 : saisie OTP ============ */

  onOtpDigitInput(event: any, index: number) {
    const input = event.target as HTMLInputElement;
    const raw = (input.value || '').replace(/\D/g, '');

    if (raw.length > 1) {
      for (let offset = 0; offset < raw.length && index + offset < 6; offset++) {
        this.otp[index + offset] = raw[offset];
        const el = document.getElementById(`agent-otp-${index + offset}`) as HTMLInputElement | null;
        if (el) el.value = raw[offset];
      }
      const focusIdx = Math.min(index + raw.length, 5);
      setTimeout(() => document.getElementById(`agent-otp-${focusIdx}`)?.focus(), 0);
      return;
    }

    const v = raw.slice(-1);
    this.otp[index] = v;
    input.value = v;
    if (v && index < 5) {
      setTimeout(() => {
        const next = document.getElementById(`agent-otp-${index + 1}`) as HTMLInputElement | null;
        next?.focus();
        next?.select();
      }, 0);
    }
  }

  trackOtpIndex(index: number): number {
    return index;
  }

  onOtpKeyDown(event: KeyboardEvent, index: number) {
    const key = event.key;
    if (key === 'Backspace') {
      if (!this.otp[index] && index > 0) {
        const prev = document.getElementById(`agent-otp-${index - 1}`) as HTMLInputElement | null;
        if (prev) { prev.focus(); this.otp[index - 1] = ''; prev.value = ''; event.preventDefault(); }
      }
    } else if (key === 'ArrowLeft' && index > 0) {
      const prev = document.getElementById(`agent-otp-${index - 1}`) as HTMLInputElement | null;
      if (prev) prev.focus();
    } else if (key === 'ArrowRight' && index < 5) {
      const next = document.getElementById(`agent-otp-${index + 1}`) as HTMLInputElement | null;
      if (next) next.focus();
    }
  }

  pasteOtp(event: ClipboardEvent) {
    const data = event.clipboardData?.getData('text') || '';
    const digits = data.replace(/\D/g, '').slice(0, 6);
    if (!digits) return;
    event.preventDefault();
    for (let i = 0; i < digits.length; i++) {
      this.otp[i] = digits[i];
      const el = document.getElementById(`agent-otp-${i}`) as HTMLInputElement | null;
      if (el) el.value = digits[i];
    }
    const last = document.getElementById(`agent-otp-${Math.min(digits.length - 1, 5)}`) as HTMLInputElement | null;
    if (last) setTimeout(() => last.focus(), 10);
  }

  get otpCode(): string {
    return this.otp.join('');
  }

  async verifyAndGoStep3() {
    if (this.otpCode.length !== 6) {
      await this.toast('AUTH.OTP_REQUIRED', 'warning');
      return;
    }
    this.verifyingOtp = true;
    try {
      const res = await this.agentAuth.verifyRegisterOtp(this.otpSentEmail || this.email.trim(), this.otpCode);
      if (!res.valid) {
        await this.toastRaw(String(res.message || this.translate.instant('AUTH.OTP_FAILED')), 'danger');
        return;
      }
      this.step = 3;
      this.persistDraft();
    } finally {
      this.verifyingOtp = false;
    }
  }

  /* ============ Étape 3 : créer compte agent ============ */

  async onSubmit() {
    if (this.otpCode.length !== 6) {
      await this.toast('AUTH.OTP_REQUIRED', 'warning');
      return;
    }
    if (!this.canGoStep2()) {
      await this.toast('AUTH.FILL_ALL_FIELDS', 'warning');
      this.step = 1;
      return;
    }
    this.loading = await this.loadingCtrl.create({ message: this.translate.instant('AUTH.REGISTERING') });
    await this.loading.present();
    try {
      const fullName = `${this.firstName.trim()} ${this.lastName.trim()}`.replace(/\s+/g, ' ');
      const res = await this.agentAuth.register(
        fullName,
        this.agencyName.trim(),
        this.email.trim().toLowerCase(),
        this.phone.trim(),
        this.password,
        this.otpCode,
        {
          firstName: this.firstName.trim(),
          lastName: this.lastName.trim(),
          activityType: this.activityType,
          activityCity: this.activityCity.trim(),
          confirmPassword: this.confirmPassword,
          acceptTerms: this.acceptTerms,
        },
      );
      await this.loading?.dismiss();
      if (res.success) {
        this.drafts.clearAgent();
        this.toast('AUTH.REGISTER_SUCCESS', 'success');
        setTimeout(() => this.router.navigateByUrl('/agent-dashboard/dashboard', { replaceUrl: true }), 350);
      } else {
        this.toast(res.message || 'AUTH.REGISTER_FAILED', 'danger');
      }
    } catch (e) {
      await this.loading?.dismiss();
      this.toast('AUTH.NETWORK_ERROR', 'danger');
    }
  }

  private restoreDraft(): void {
    const draft = this.drafts.loadAgent();
    if (!draft) return;
    this.step = draft.step;
    this.firstName = draft.firstName || '';
    this.lastName = draft.lastName || '';
    if (!this.firstName && draft.fullName) {
      const parts = draft.fullName.trim().split(/\s+/);
      this.firstName = parts[0] || '';
      this.lastName = parts.slice(1).join(' ') || '';
    }
    this.agencyName = draft.agencyName || '';
    this.email = draft.email || '';
    this.phone = draft.phone || '';
    this.activityType = (draft.activityType as AgentActivityTypeValue) || '';
    this.activityCity = draft.activityCity || '';
    this.acceptTerms = !!draft.acceptTerms;
    this.otp = Array.isArray(draft.otp) && draft.otp.length === 6 ? [...draft.otp] : ['', '', '', '', '', ''];
    this.otpSentEmail = draft.otpSentEmail || '';
    this.otpExpireAt = draft.otpExpireAt;
    this.otpResendAt = draft.otpResendAt;
    // Mot de passe non persisté : si étape finale, revenir aux infos pour le ressaisir
    if (this.step === 3 && !this.password) {
      this.step = 1;
    }
    this.syncCountdownsFromDeadlines();
  }

  private persistDraft(): void {
    if (this.step === 1 && !this.email.trim() && !this.firstName.trim()) {
      this.drafts.clearAgent();
      return;
    }
    this.drafts.saveAgent({
      step: this.step,
      firstName: this.firstName,
      lastName: this.lastName,
      agencyName: this.agencyName,
      email: this.email,
      phone: this.phone,
      activityType: this.activityType,
      activityCity: this.activityCity,
      acceptTerms: this.acceptTerms,
      otp: [...this.otp],
      otpSentEmail: this.otpSentEmail,
      otpExpireAt: this.otpExpireAt,
      otpResendAt: this.otpResendAt,
    });
  }

  private syncCountdownsFromDeadlines(): void {
    const now = Date.now();
    this.countdownExpireSec = this.otpExpireAt
      ? Math.max(0, Math.ceil((this.otpExpireAt - now) / 1000))
      : 0;
    this.countdownResendSec = this.otpResendAt
      ? Math.max(0, Math.ceil((this.otpResendAt - now) / 1000))
      : 0;
  }

  /* ============ toasts helpers ============ */

  private async toast(key: string, color: 'success' | 'danger' | 'warning') {
    const t = await this.toastCtrl.create({
      message: this.translate.instant(key),
      duration: 2500,
      color,
      position: 'top',
    });
    await t.present();
  }

  private async toastRaw(text: string, color: 'success' | 'danger' | 'warning') {
    const t = await this.toastCtrl.create({ message: text, duration: 6000, color, position: 'top' });
    await t.present();
  }
}
