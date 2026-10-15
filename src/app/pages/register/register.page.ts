import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { App } from '@capacitor/app';
import { Capacitor, PluginListenerHandle } from '@capacitor/core';
import { LoadingController, ToastController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { ONBOARDING_SEEN_KEY } from '../../guards/onboarding.guard';
import { TUNISIA_CITIES } from '../../data/cities';
import { NATIONALITIES } from '../../data/nationalities';
import { UNIVERSITIES, UniversityOption } from '../../data/universities';
import { AuthService } from '../../services/auth.service';
import { MessagesService } from '../../services/messages.service';
import { RegisterDraftService } from '../../services/register-draft.service';
import { ThemeService } from '../../services/theme.service';
import { UploadService } from '../../services/upload.service';

type Step = 'email' | 'otp' | 'name' | 'photo' | 'welcome';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: false,
})
export class RegisterPage implements OnInit, OnDestroy {

  step: Step = 'email';

  email = '';
  acceptTerms = false;

  otp = ['', '', '', '', '', ''];
  sendingOtp = false;
  verifyingOtp = false;
  otpSentEmail = '';
  otpExpiresInSec = 600;
  otpResendCooldownSec = 45;
  countdownResendSec = 0;
  countdownExpireSec = 0;
  private otpExpireAt: number | null = null;
  private otpResendAt: number | null = null;
  devLastOtpCode: string | undefined;

  firstName = '';
  lastName = '';
  nationality = '';
  phone = '';
  city = '';
  university = '';
  password = '';
  confirmPassword = '';
  showPassword = false;
  universities: UniversityOption[] = UNIVERSITIES;
  nationalities = NATIONALITIES;
  cities = TUNISIA_CITIES;
  creatingAccount = false;
  accountCreated = false;

  photoPreview: string | null = null;
  private photoFile: File | null = null;
  uploadingPhoto = false;

  welcomeName = '';
  finishingWelcome = false;
  private countdownTimer: ReturnType<typeof setInterval> | null = null;
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

  readonly bubbles = Array.from({ length: 14 }, (_, i) => ({
    size: 18 + ((i * 17) % 70),
    left: ((i * 23) % 92) + 2,
    delay: (i * 0.35) % 4,
    duration: 6 + (i % 5),
    opacity: 0.08 + ((i % 5) * 0.04),
  }));

  constructor(
    public theme: ThemeService,
    private auth: AuthService,
    private upload: UploadService,
    private messages: MessagesService,
    private drafts: RegisterDraftService,
    private router: Router,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    this.restoreDraft();
    this.countdownTimer = setInterval(() => {
      this.syncCountdownsFromDeadlines();
    }, 1000);
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

  ngOnDestroy(): void {
    if (this.countdownTimer) clearInterval(this.countdownTimer);
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.onVisibility);
    }
    void this.appPauseHandle?.remove();
    this.persistDraft();
  }

  get otpCode(): string {
    return this.otp.join('');
  }

  get canResend(): boolean {
    return this.countdownResendSec <= 0 && this.step === 'otp';
  }

  get remainingExpireSecFmt(): string {
    const s = Math.max(0, this.countdownExpireSec);
    const mm = Math.floor(s / 60).toString().padStart(2, '0');
    const ss = (s % 60).toString().padStart(2, '0');
    return `${mm}:${ss}`;
  }

  get stepIndex(): number {
    switch (this.step) {
      case 'email': return 1;
      case 'otp': return 2;
      case 'name': return 3;
      case 'photo': return 4;
      default: return 5;
    }
  }

  goBack(): void {
    if (this.step === 'welcome') return;
    if (this.step === 'photo') {
      this.step = 'name';
      this.persistDraft();
      return;
    }
    if (this.step === 'name') {
      if (this.accountCreated) return;
      this.step = 'otp';
      this.persistDraft();
      return;
    }
    if (this.step === 'otp') {
      this.step = 'email';
      this.otp = ['', '', '', '', '', ''];
      this.persistDraft();
      return;
    }
    window.history.back();
  }

  goStudentRegister(): void {
    this.router.navigateByUrl('/register', { replaceUrl: true });
  }

  goAgentRegister(): void {
    this.router.navigateByUrl('/agent-register', { replaceUrl: true });
  }

  canSendOtp(): boolean {
    if (!this.acceptTerms) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim());
  }

  async sendOtp(): Promise<void> {
    if (!this.canSendOtp()) {
      await this.toast(this.acceptTerms ? 'AUTH.ERROR_EMAIL_REQUIRED' : 'AUTH.ERROR_ACCEPT_TERMS', 'warning');
      return;
    }
    this.sendingOtp = true;
    try {
      const res = await this.auth.sendRegisterOtp(this.email.trim());
      if (!res.sent) {
        await this.toast('AUTH.OTP_FAILED', 'danger');
        return;
      }
      this.otpSentEmail = res.email;
      this.otpExpiresInSec = Number(res.expiresInSec || 600);
      this.otpExpireAt = Date.now() + this.otpExpiresInSec * 1000;
      this.otpResendAt = Date.now() + this.otpResendCooldownSec * 1000;
      this.syncCountdownsFromDeadlines();
      this.devLastOtpCode = res.devCode;
      this.otp = ['', '', '', '', '', ''];
      this.step = 'otp';
      this.persistDraft();
      setTimeout(() => document.getElementById('otp-0')?.focus(), 50);
      const msg = this.devLastOtpCode
        ? this.translate.instant('AUTH.CODE_SENT_DEV', { code: this.devLastOtpCode })
        : this.translate.instant('AUTH.OTP_SENT_EMAIL');
      await this.toastRaw(msg, 'success');
    } catch (e: any) {
      await this.toastRaw(e?.message ? String(e.message) : this.translate.instant('AUTH.NETWORK_ERROR'), 'danger');
    } finally {
      this.sendingOtp = false;
    }
  }

  async resendOtp(): Promise<void> {
    if (!this.canResend) return;
    await this.sendOtp();
  }

  onOtpDigitInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const raw = (input.value || '').replace(/\D/g, '');

    // Autofill / collage dans une seule case → répartir les chiffres
    if (raw.length > 1) {
      event.preventDefault?.();
      for (let offset = 0; offset < raw.length && index + offset < 6; offset++) {
        this.otp[index + offset] = raw[offset];
        const el = document.getElementById(`otp-${index + offset}`) as HTMLInputElement | null;
        if (el) el.value = raw[offset];
      }
      const focusIdx = Math.min(index + raw.length, 5);
      setTimeout(() => document.getElementById(`otp-${focusIdx}`)?.focus(), 0);
      return;
    }

    const v = raw.slice(-1);
    this.otp[index] = v;
    input.value = v;
    if (v && index < 5) {
      setTimeout(() => {
        const next = document.getElementById(`otp-${index + 1}`) as HTMLInputElement | null;
        next?.focus();
        next?.select();
      }, 0);
    }
  }

  trackOtpIndex(index: number): number {
    return index;
  }

  onOtpKeyDown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Backspace') {
      if (!this.otp[index] && index > 0) {
        const prev = document.getElementById(`otp-${index - 1}`) as HTMLInputElement | null;
        if (prev) {
          prev.focus();
          this.otp[index - 1] = '';
          prev.value = '';
          event.preventDefault();
        }
      }
    } else if (event.key === 'ArrowLeft' && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus();
    } else if (event.key === 'ArrowRight' && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }
  }

  pasteOtp(event: ClipboardEvent): void {
    const data = event.clipboardData?.getData('text') || '';
    const digits = data.replace(/\D/g, '').slice(0, 6);
    if (!digits) return;
    event.preventDefault();
    for (let i = 0; i < digits.length; i++) {
      this.otp[i] = digits[i];
      const el = document.getElementById(`otp-${i}`) as HTMLInputElement | null;
      if (el) el.value = digits[i];
    }
  }

  async verifyOtp(): Promise<void> {
    if (this.otpCode.length !== 6) {
      await this.toast('AUTH.OTP_REQUIRED', 'warning');
      return;
    }
    this.verifyingOtp = true;
    try {
      const res = await this.auth.verifyRegisterOtp(this.otpSentEmail || this.email.trim(), this.otpCode);
      if (!res.valid) {
        await this.toast(res.message || 'AUTH.OTP_FAILED', 'danger');
        return;
      }
      this.step = 'name';
      this.persistDraft();
    } finally {
      this.verifyingOtp = false;
    }
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  canSubmitName(): boolean {
    return (
      this.firstName.trim().length >= 2 &&
      this.lastName.trim().length >= 2 &&
      !!this.nationality.trim() &&
      !!this.phone.trim() &&
      !!this.city.trim() &&
      !!this.university.trim() &&
      this.password.length >= 6 &&
      this.password === this.confirmPassword
    );
  }

  async submitName(): Promise<void> {
    if (!this.canSubmitName()) {
      if (this.firstName.trim().length < 2 || this.lastName.trim().length < 2) {
        await this.toast('AUTH.NAME_REQUIRED', 'warning');
      } else if (!this.nationality.trim()) {
        await this.toast('FIELDS.NATIONALITY_REQUIRED', 'warning');
      } else if (!this.phone.trim()) {
        await this.toast('AUTH.ERROR_PHONE_REQUIRED', 'warning');
      } else if (!this.city.trim()) {
        await this.toast('FIELDS.CITY_REQUIRED', 'warning');
      } else if (!this.university.trim()) {
        await this.toast('FIELDS.UNIVERSITY_REQUIRED', 'warning');
      } else if (this.password.length < 6) {
        await this.toast('AUTH.ERROR_PASSWORD_LENGTH', 'warning');
      } else if (this.password !== this.confirmPassword) {
        await this.toast('AUTH.ERROR_PASSWORD_MISMATCH', 'warning');
      } else {
        await this.toast('AUTH.FILL_ALL_FIELDS', 'warning');
      }
      return;
    }

    const fullName = `${this.firstName.trim()} ${this.lastName.trim()}`.replace(/\s+/g, ' ');
    this.welcomeName = this.firstName.trim();
    const university = this.university.trim();
    const phone = this.phone.trim();
    const nationality = this.nationality.trim();
    const city = this.city.trim();

    if (this.accountCreated) {
      await this.auth.updateProfile({ fullName, university, phone, nationality, city });
      this.step = 'photo';
      this.persistDraft();
      return;
    }

    if (this.otpCode.length !== 6) {
      this.step = 'otp';
      await this.toast('AUTH.OTP_REQUIRED', 'warning');
      return;
    }

    this.creatingAccount = true;
    this.loading = await this.loadingCtrl.create({
      message: this.translate.instant('AUTH.REGISTERING'),
    });
    await this.loading.present();

    const email = (this.otpSentEmail || this.email).trim().toLowerCase();

    try {
      const res = await this.auth.register(
        fullName,
        email,
        this.password,
        phone,
        university,
        this.otpCode,
        {
          firstName: this.firstName.trim(),
          lastName: this.lastName.trim(),
          nationality,
          city,
          confirmPassword: this.confirmPassword,
          acceptTerms: this.acceptTerms,
        },
      );
      await this.loading?.dismiss();
      if (!res.success) {
        await this.toast(res.message || 'AUTH.REGISTER_FAILED', 'danger');
        return;
      }
      this.accountCreated = true;
      this.step = 'photo';
      this.persistDraft();
    } catch {
      await this.loading?.dismiss();
      await this.toast('AUTH.NETWORK_ERROR', 'danger');
    } finally {
      this.creatingAccount = false;
    }
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.photoFile = file;
    const reader = new FileReader();
    reader.onload = () => {
      this.photoPreview = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  clearPhoto(): void {
    this.photoFile = null;
    this.photoPreview = null;
  }

  async continuePhoto(): Promise<void> {
    if (this.photoFile) {
      this.uploadingPhoto = true;
      try {
        const uploaded = await this.upload.uploadFile(this.photoFile, 'avatars');
        await this.auth.updateProfile({ avatarUrl: uploaded.url });
      } catch {
        await this.toast('AUTH.PHOTO_UPLOAD_FAILED', 'warning');
      } finally {
        this.uploadingPhoto = false;
      }
    }
    this.startWelcome();
  }

  skipPhoto(): void {
    this.startWelcome();
  }

  private startWelcome(): void {
    this.step = 'welcome';
    localStorage.setItem(ONBOARDING_SEEN_KEY, 'true');
    this.persistDraft();
  }

  async skipWelcome(): Promise<void> {
    if (this.finishingWelcome) return;
    this.finishingWelcome = true;
    try {
      await this.messages.ensureStudhubWelcome(this.welcomeName);
    } catch {
      /* offline : message local éventuel déjà géré dans le service */
    }
    this.drafts.clearStudent();
    await this.router.navigateByUrl('/tabs/tab1', { replaceUrl: true });
    this.finishingWelcome = false;
  }

  private restoreDraft(): void {
    const draft = this.drafts.loadStudent();
    if (!draft) return;
    this.step = draft.step;
    this.email = draft.email || '';
    this.acceptTerms = !!draft.acceptTerms;
    this.otp = Array.isArray(draft.otp) && draft.otp.length === 6 ? [...draft.otp] : ['', '', '', '', '', ''];
    this.otpSentEmail = draft.otpSentEmail || '';
    this.otpExpireAt = draft.otpExpireAt;
    this.otpResendAt = draft.otpResendAt;
    this.firstName = draft.firstName || '';
    this.lastName = draft.lastName || '';
    this.nationality = draft.nationality || '';
    this.phone = draft.phone || '';
    this.city = draft.city || '';
    this.university = draft.university || '';
    this.accountCreated = !!draft.accountCreated;
    this.welcomeName = draft.welcomeName || this.firstName;
    this.syncCountdownsFromDeadlines();
  }

  private persistDraft(): void {
    if (this.step === 'email' && !this.email.trim() && !this.otpSentEmail) {
      this.drafts.clearStudent();
      return;
    }
    this.drafts.saveStudent({
      step: this.step,
      email: this.email,
      acceptTerms: this.acceptTerms,
      otp: [...this.otp],
      otpSentEmail: this.otpSentEmail,
      otpExpireAt: this.otpExpireAt,
      otpResendAt: this.otpResendAt,
      firstName: this.firstName,
      lastName: this.lastName,
      nationality: this.nationality,
      phone: this.phone,
      city: this.city,
      university: this.university,
      accountCreated: this.accountCreated,
      welcomeName: this.welcomeName,
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
    const t = await this.toastCtrl.create({ message: text, duration: 6000, color, position: 'top' });
    await t.present();
  }
}
