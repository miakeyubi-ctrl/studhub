import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { Partner, PartnerAnnouncement, PartnersService } from '../../services/partners.service';

@Component({
  selector: 'app-partner-details',
  templateUrl: './partner-details.page.html',
  styleUrls: ['./partner-details.page.scss'],
  standalone: false,
})
export class PartnerDetailsPage implements OnInit {
  loading = true;
  notFound = false;
  partner?: Partner;
  announcements: PartnerAnnouncement[] = [];
  liked = false;
  likeBusy = false;

  constructor(
    private route: ActivatedRoute,
    private location: Location,
    private partnersService: PartnersService,
    private toastCtrl: ToastController,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    void this.load(id);
  }

  private async load(id: number): Promise<void> {
    try {
      this.partner = await this.partnersService.getPartner(id);
      this.liked = this.hasLikedLocally(id);
      this.announcements = await this.partnersService.listPublicAnnouncements(id);
    } catch {
      this.notFound = true;
    } finally {
      this.loading = false;
    }
  }

  /** Numéro local tunisien (8 chiffres) → format international +216 */
  private intlPhone(phone: string): string {
    const digits = phone.replace(/[^\d+]/g, '');
    return digits.startsWith('+') ? digits : `+216${digits}`;
  }

  get telLink(): string {
    return this.partner?.phone ? `tel:${this.intlPhone(this.partner.phone)}` : '';
  }

  get whatsappLink(): string {
    return this.partner?.phone ? `https://wa.me/${this.intlPhone(this.partner.phone).replace('+', '')}` : '';
  }

  async openWebsite(): Promise<void> {
    if (!this.partner?.websiteUrl) return;
    await this.registerClick();
    window.open(this.partner.websiteUrl, '_blank');
  }

  async onContactClick(): Promise<void> {
    await this.registerClick();
  }

  async toggleLike(): Promise<void> {
    if (!this.partner || this.likeBusy || this.liked) return;
    this.likeBusy = true;
    try {
      const res = await this.partnersService.trackLike(this.partner.id);
      this.partner = {
        ...this.partner,
        likesCount: res.likesCount ?? (this.partner.likesCount || 0) + 1,
      };
      this.markLikedLocally(this.partner.id);
      this.liked = true;
    } finally {
      this.likeBusy = false;
    }
  }

  async copyPromoCode(): Promise<void> {
    const code = this.partner?.promoCode;
    if (!code) return;
    await this.registerClick();
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      return;
    }
    const toast = await this.toastCtrl.create({
      message: this.translate.instant('PARTNERS_PAGE.COPIED'),
      duration: 1500,
      color: 'success',
      position: 'top',
    });
    await toast.present();
  }

  private async registerClick(): Promise<void> {
    if (!this.partner) return;
    const res = await this.partnersService.trackClick(this.partner.id);
    this.partner = {
      ...this.partner,
      clicksCount: res.clicksCount ?? (this.partner.clicksCount || 0) + 1,
    };
  }

  private likeKey(id: number): string {
    return `studhub-partner-liked-${id}`;
  }

  private hasLikedLocally(id: number): boolean {
    try {
      return localStorage.getItem(this.likeKey(id)) === '1';
    } catch {
      return false;
    }
  }

  private markLikedLocally(id: number): void {
    try {
      localStorage.setItem(this.likeKey(id), '1');
    } catch { /* ignore */ }
  }

  goBack(): void {
    this.location.back();
  }
}
