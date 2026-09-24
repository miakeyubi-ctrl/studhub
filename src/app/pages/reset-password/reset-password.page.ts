import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.page.html',
  styleUrls: ['./reset-password.page.scss'],
  standalone: false,
})
export class ResetPasswordPage implements OnInit {

  email = '';
  code = '';
  password = '';
  confirmPassword = '';
  showPassword = false;
  loading = false;
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
    this.email = this.route.snapshot.queryParamMap.get('email') || '';
    this.code = this.route.snapshot.queryParamMap.get('code') || '';
  }

  goBack() {
    window.history.back();
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  async reset() {
    this.errorMessage = '';

    if (!this.password || !this.confirmPassword) {
      this.errorMessage = 'AUTH.ERROR_PASSWORD_REQUIRED';
      return;
    }

    if (this.password.length < 6) {
      this.errorMessage = 'AUTH.ERROR_PASSWORD_LENGTH';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'AUTH.ERROR_PASSWORD_MISMATCH';
      return;
    }

    this.loading = true;
    const result = this.authService.resetPassword(this.email, this.code, this.password);
    this.loading = false;

    if (!result.success) {
      this.errorMessage = result.message || 'AUTH.ERROR_ACCOUNT_NOT_FOUND';
      return;
    }

    const toast = await this.toastController.create({
      message: this.translate.instant('AUTH.SUCCESS_RESET'),
      duration: 2500,
      color: 'success',
      position: 'top'
    });
    await toast.present();

    this.router.navigateByUrl('/login');
  }
}
