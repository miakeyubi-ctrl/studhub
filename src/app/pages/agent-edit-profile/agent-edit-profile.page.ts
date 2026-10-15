import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { TUNISIA_CITIES } from '../../data/cities';
import { AgentAuthService } from '../../services/agent-auth.service';
import { ThemeService } from '../../services/theme.service';
import { UploadService } from '../../services/upload.service';
import { hasRealAvatar, initialsBg, initialsFromName } from '../../utils/avatar.util';

@Component({
  selector: 'app-agent-edit-profile',
  templateUrl: './agent-edit-profile.page.html',
  styleUrls: ['./agent-edit-profile.page.scss'],
  standalone: false,
})
export class AgentEditProfilePage implements OnInit {
  @ViewChild('avatarInput') avatarInput?: ElementRef<HTMLInputElement>;

  email = '';
  firstName = '';
  lastName = '';
  agencyName = '';
  phone = '';
  activityCity = '';
  address = '';
  websiteUrl = '';
  description = '';
  avatarUrl = '';
  initials = '?';
  avatarBg = '#0f766e';
  hasAvatar = false;
  cities = TUNISIA_CITIES;
  loading = false;
  uploadingAvatar = false;
  errorMessage = '';

  constructor(
    private location: Location,
    private router: Router,
    private agentAuth: AgentAuthService,
    private toastController: ToastController,
    private translate: TranslateService,
    private upload: UploadService,
    public theme: ThemeService,
  ) {}

  ngOnInit() {
    const agent = this.agentAuth.currentAgent;
    if (!agent) {
      void this.router.navigateByUrl('/agent-login');
      return;
    }
    this.email = agent.email;
    this.firstName = agent.firstName || '';
    this.lastName = agent.lastName || '';
    if (!this.firstName && agent.fullName) {
      const parts = agent.fullName.trim().split(/\s+/);
      this.firstName = parts[0] || '';
      this.lastName = parts.slice(1).join(' ') || '';
    }
    this.agencyName = agent.agencyName || '';
    this.phone = agent.phone || '';
    this.activityCity = agent.activityCity || '';
    this.address = agent.address || '';
    this.websiteUrl = agent.websiteUrl || '';
    this.description = agent.description || '';
    this.avatarUrl = agent.avatarUrl || '';
    this.hasAvatar = hasRealAvatar(agent.avatarUrl);
    this.initials = initialsFromName(agent.fullName, agent.email);
    this.avatarBg = initialsBg(agent.fullName, agent.email);
  }

  get displayInitials(): string {
    return initialsFromName(`${this.firstName} ${this.lastName}`.trim() || this.email);
  }

  goBack() {
    if (window.history.length > 1) {
      this.location.back();
      return;
    }
    void this.router.navigateByUrl('/agent-dashboard/profile');
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
        await this.agentAuth.updateProfile({ avatarUrl: uploaded.url });
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
    if (this.firstName.trim().length < 2 || this.lastName.trim().length < 2) {
      this.errorMessage = 'AUTH.NAME_REQUIRED';
      return;
    }

    this.loading = true;
    const result = await this.agentAuth.updateProfile({
      firstName: this.firstName.trim(),
      lastName: this.lastName.trim(),
      agencyName: this.agencyName.trim() || undefined,
      phone: this.phone.trim() || undefined,
      activityCity: this.activityCity.trim() || undefined,
      address: this.address.trim() || undefined,
      websiteUrl: this.websiteUrl.trim() || undefined,
      description: this.description.trim() || undefined,
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
    void this.router.navigateByUrl('/agent-dashboard/profile');
  }
}
