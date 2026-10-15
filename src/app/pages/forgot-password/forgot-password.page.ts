import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.page.html',
  styleUrls: ['./forgot-password.page.scss'],
  standalone: false,
})
export class ForgotPasswordPage implements OnInit {

  email = '';
  loading = false;
  errorMessage = '';

  constructor(
    private router: Router,
    private authService: AuthService,
    private toastController: ToastController,
    private translate: TranslateService,
    public theme: ThemeService
  ) { }

  ngOnInit() {
  }

  goBack() {
    window.history.back();
  }

  async sendCode() {
    this.errorMessage = '';

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim())) {
      this.errorMessage = 'AUTH.ERROR_EMAIL_REQUIRED';
      return;
    }

    this.loading = true;
    const result = await this.authService.sendResetCode(this.email.trim());
    this.loading = false;

    if (!result.success) {
      this.errorMessage = result.message || 'AUTH.ERROR_NO_ACCOUNT';
      return;
    }

    const toast = await this.toastController.create({
      message: result.devCode
        ? this.translate.instant('AUTH.CODE_SENT_DEV', { code: result.devCode })
        : this.translate.instant('AUTH.CODE_SENT_EMAIL'),
      duration: 4000,
      color: 'success',
      position: 'top'
    });
    await toast.present();

    this.router.navigate(['/verify-code'], { queryParams: { email: this.email.trim().toLowerCase() } });
  }
}
