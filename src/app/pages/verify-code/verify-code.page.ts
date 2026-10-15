import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-verify-code',
  templateUrl: './verify-code.page.html',
  styleUrls: ['./verify-code.page.scss'],
  standalone: false,
})
export class VerifyCodePage implements OnInit {

  email = '';
  digits: string[] = ['', '', '', '', '', ''];
  loading = false;
  resending = false;
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private toastController: ToastController,
    private translate: TranslateService,
    public theme: ThemeService
  ) { }

  ngOnInit() {
    this.email = this.route.snapshot.queryParamMap.get('email')
      || this.route.snapshot.queryParamMap.get('phone')
      || '';
  }

  goBack() {
    window.history.back();
  }

  onDigitInput(index: number, event: Event) {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/\D/g, '').slice(-1);
    this.digits[index] = value;

    if (value && index < this.digits.length - 1) {
      const next = document.getElementById('code-' + (index + 1)) as HTMLInputElement;
      next?.focus();
    }
  }

  onDigitKeydown(index: number, event: KeyboardEvent) {
    if (event.key === 'Backspace' && !this.digits[index] && index > 0) {
      const prev = document.getElementById('code-' + (index - 1)) as HTMLInputElement;
      prev?.focus();
    }
  }

  get code(): string {
    return this.digits.join('');
  }

  async verify() {
    this.errorMessage = '';

    if (this.code.length < 6) {
      this.errorMessage = 'AUTH.ERROR_CODE_LENGTH';
      return;
    }

    this.loading = true;
    const result = await this.authService.verifyResetCode(this.email, this.code);
    this.loading = false;

    if (!result.success) {
      this.errorMessage = result.message || 'AUTH.ERROR_CODE_INCORRECT';
      return;
    }

    this.router.navigate(['/reset-password'], {
      queryParams: { email: this.email, code: this.code }
    });
  }

  async resendCode() {
    this.resending = true;
    const result = await this.authService.sendResetCode(this.email);
    this.resending = false;

    const message = result.success
      ? (result.devCode
        ? this.translate.instant('AUTH.RESEND_CODE_SENT_DEV', { code: result.devCode })
        : this.translate.instant('AUTH.RESEND_CODE_SENT'))
      : this.translate.instant(result.message || 'AUTH.ERROR_NO_ACCOUNT');

    const toast = await this.toastController.create({
      message,
      duration: 4000,
      color: result.success ? 'success' : 'danger',
      position: 'top'
    });
    await toast.present();
  }
}
