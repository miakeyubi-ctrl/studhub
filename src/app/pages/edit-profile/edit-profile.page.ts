import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-edit-profile',
  templateUrl: './edit-profile.page.html',
  styleUrls: ['./edit-profile.page.scss'],
  standalone: false,
})
export class EditProfilePage implements OnInit {

  email = '';
  fullName = '';
  phone = '';
  university = '';
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
    const user = this.authService.currentUser;

    if (!user) {
      this.router.navigateByUrl('/login');
      return;
    }

    this.email = user.email;
    this.fullName = user.fullName;
    this.phone = user.phone || '';
    this.university = user.university || '';
  }

  goBack() {
    window.history.back();
  }

  async save() {
    this.errorMessage = '';

    if (!this.fullName.trim()) {
      this.errorMessage = 'EDIT_PROFILE.ERROR_NAME_REQUIRED';
      return;
    }

    this.loading = true;
    const result = this.authService.updateProfile({
      fullName: this.fullName.trim(),
      phone: this.phone.trim() || undefined,
      university: this.university.trim() || undefined
    });
    this.loading = false;

    if (!result.success) {
      this.errorMessage = result.message || 'AUTH.ERROR_NOT_LOGGED_IN';
      return;
    }

    const toast = await this.toastController.create({
      message: this.translate.instant('EDIT_PROFILE.SUCCESS'),
      duration: 2000,
      color: 'success',
      position: 'top'
    });
    await toast.present();

    this.router.navigateByUrl('/tabs/tab3');
  }
}
