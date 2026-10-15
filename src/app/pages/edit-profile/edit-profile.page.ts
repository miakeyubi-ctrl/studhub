import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { TUNISIA_CITIES } from '../../data/cities';
import { NATIONALITIES } from '../../data/nationalities';
import { UNIVERSITIES, UniversityOption, matchUniversity } from '../../data/universities';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { UploadService } from '../../services/upload.service';
import { hasRealAvatar, initialsBg, initialsFromName } from '../../utils/avatar.util';

@Component({
  selector: 'app-edit-profile',
  templateUrl: './edit-profile.page.html',
  styleUrls: ['./edit-profile.page.scss'],
  standalone: false,
})
export class EditProfilePage implements OnInit {
  @ViewChild('avatarInput') avatarInput?: ElementRef<HTMLInputElement>;

  email = '';
  fullName = '';
  phone = '';
  nationality = '';
  city = '';
  university = '';
  studyLevel = '';
  bio = '';
  avatarUrl = '';
  initials = '?';
  avatarBg = '#0f766e';
  hasAvatar = false;
  universities: UniversityOption[] = UNIVERSITIES;
  nationalities = NATIONALITIES;
  cities = TUNISIA_CITIES;
  studyLevels = [
    { value: 'Licence 1', key: 'EDIT_PROFILE.LEVEL_L1' },
    { value: 'Licence 2', key: 'EDIT_PROFILE.LEVEL_L2' },
    { value: 'Licence 3', key: 'EDIT_PROFILE.LEVEL_L3' },
    { value: 'Master 1', key: 'EDIT_PROFILE.LEVEL_M1' },
    { value: 'Master 2', key: 'EDIT_PROFILE.LEVEL_M2' },
    { value: 'Doctorat', key: 'EDIT_PROFILE.LEVEL_PHD' },
    { value: 'Autre', key: 'EDIT_PROFILE.LEVEL_OTHER' },
  ];
  loading = false;
  uploadingAvatar = false;
  errorMessage = '';

  constructor(
    private location: Location,
    private router: Router,
    private authService: AuthService,
    private toastController: ToastController,
    private translate: TranslateService,
    private upload: UploadService,
    public theme: ThemeService,
  ) {}

  ngOnInit() {
    const user = this.authService.currentUser;

    if (!user) {
      this.router.navigateByUrl('/login');
      return;
    }

    this.email = user.email;
    this.fullName = user.fullName;
    this.phone = user.phone || '';
    this.nationality = user.nationality || '';
    this.city = user.city || '';
    const matched = matchUniversity(user.university || '');
    this.university = matched?.name || user.university || '';
    this.studyLevel = user.studyLevel || '';
    this.bio = user.bio || '';
    this.avatarUrl = user.avatarUrl || '';
    this.hasAvatar = hasRealAvatar(user.avatarUrl);
    this.initials = initialsFromName(user.fullName, user.email);
    this.avatarBg = initialsBg(user.fullName, user.email);
  }

  get displayInitials(): string {
    return initialsFromName(this.fullName || this.email);
  }

  goBack() {
    if (window.history.length > 1) {
      this.location.back();
      return;
    }
    void this.router.navigateByUrl('/tabs/tab3');
  }

  pickAvatar(): void {
    this.avatarInput?.nativeElement.click();
  }

  async onAvatarSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.uploadingAvatar = true;
    this.errorMessage = '';
    try {
      const uploaded = await this.upload.uploadFile(file, 'avatars');
      if (uploaded?.url) {
        this.avatarUrl = uploaded.url;
        this.hasAvatar = true;
        await this.authService.updateProfile({ avatarUrl: uploaded.url });
        const toast = await this.toastController.create({
          message: this.translate.instant('EDIT_PROFILE.AVATAR_SUCCESS'),
          duration: 1800,
          color: 'success',
          position: 'top',
        });
        await toast.present();
      }
    } catch {
      this.errorMessage = 'EDIT_PROFILE.AVATAR_ERROR';
    } finally {
      this.uploadingAvatar = false;
      input.value = '';
    }
  }

  async save() {
    this.errorMessage = '';

    if (!this.fullName.trim()) {
      this.errorMessage = 'EDIT_PROFILE.ERROR_NAME_REQUIRED';
      return;
    }

    this.loading = true;
    const result = await this.authService.updateProfile({
      fullName: this.fullName.trim(),
      phone: this.phone.trim() || undefined,
      nationality: this.nationality.trim() || undefined,
      city: this.city.trim() || undefined,
      university: this.university.trim() || undefined,
      studyLevel: this.studyLevel.trim() || undefined,
      bio: this.bio.trim() || undefined,
      avatarUrl: this.avatarUrl || undefined,
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
      position: 'top',
    });
    await toast.present();

    this.router.navigateByUrl('/tabs/tab3');
  }
}
