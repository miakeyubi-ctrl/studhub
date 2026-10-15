import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Partner, PartnerInput, PartnersService } from '../../services/partners.service';
import { UploadService } from '../../services/upload.service';

type ImageField = 'logoUrl' | 'coverUrl';

const EMPTY_FORM: PartnerInput = {
  name: '',
  category: '',
  offer: '',
  description: '',
  discount: '',
  promoCode: '',
  logoUrl: '',
  coverUrl: '',
  websiteUrl: '',
  phone: '',
  email: '',
  loginEmail: '',
  password: '',
  city: '',
  address: '',
  validUntil: '',
  isActive: true,
  sortOrder: 0,
};

@Component({
  selector: 'app-admin-partner-form',
  templateUrl: './admin-partner-form.page.html',
  styleUrls: ['./admin-partner-form.page.scss'],
  standalone: false,
})
export class AdminPartnerFormPage implements OnInit {
  partnerId: number | null = null;
  form: PartnerInput = { ...EMPTY_FORM };
  loading = false;
  saving = false;
  uploading: Record<ImageField, boolean> = { logoUrl: false, coverUrl: false };

  constructor(
    private route: ActivatedRoute,
    private location: Location,
    private partnersService: PartnersService,
    private uploadService: UploadService,
    private toastCtrl: ToastController,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    // Route /admin/partners/new → création (pas d'id)
    if (id && id !== 'new' && !Number.isNaN(Number(id))) {
      this.partnerId = Number(id);
      void this.load(this.partnerId);
    }
  }

  get isEdit(): boolean {
    return this.partnerId !== null;
  }

  private async load(id: number): Promise<void> {
    this.loading = true;
    try {
      const p: Partner = await this.partnersService.adminGet(id);
      // On ne reprend que les champs éditables (pas id / createdAt / updatedAt)
      const form = { ...EMPTY_FORM } as Record<string, unknown>;
      for (const key of Object.keys(EMPTY_FORM)) {
        form[key] = (p as unknown as Record<string, unknown>)[key] ?? '';
      }
      // <input type="date"> attend yyyy-MM-dd
      form['validUntil'] = p.validUntil ? p.validUntil.slice(0, 10) : '';
      this.form = form as unknown as PartnerInput;
    } catch {
      await this.showToast('ADMIN_PARTNERS.ERROR', 'danger');
      this.location.back();
    } finally {
      this.loading = false;
    }
  }

  async onImageSelected(event: Event, field: ImageField): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.uploading[field] = true;
    try {
      const uploaded = await this.uploadService.uploadFile(file, 'partners');
      this.form[field] = uploaded.url;
    } catch (err) {
      await this.showToast(err instanceof Error ? err.message : 'ADMIN_PARTNERS.ERROR', 'danger');
    } finally {
      this.uploading[field] = false;
      input.value = '';
    }
  }

  get canSave(): boolean {
    const f = this.form;
    return !!(f.name.trim() && f.category.trim() && f.offer.trim() && f.logoUrl) && !this.saving;
  }

  async save(): Promise<void> {
    if (!this.canSave) {
      await this.showToast('ADMIN_PARTNERS.REQUIRED_FIELDS', 'danger');
      return;
    }
    this.saving = true;
    // Champs vides → null : ignorés par @IsOptional côté API, et effacent la valeur en modification
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(this.form)) {
      cleaned[k] = typeof v === 'string' && v.trim() === '' ? null : v;
    }
    // Mot de passe vide en édition → ne pas envoyer (conserver l'existant)
    if (!this.form.password || !String(this.form.password).trim()) {
      delete cleaned['password'];
    }
    const payload = cleaned as unknown as PartnerInput;
    payload.sortOrder = Number(this.form.sortOrder) || 0;

    try {
      if (this.partnerId !== null) {
        await this.partnersService.update(this.partnerId, payload);
      } else {
        await this.partnersService.create(payload);
      }
      await this.showToast('ADMIN_PARTNERS.SAVED', 'success');
      this.location.back();
    } catch (err) {
      const serverMsg = err instanceof HttpErrorResponse ? err.error?.message : null;
      await this.showToast(
        Array.isArray(serverMsg) ? serverMsg.join('\n') : serverMsg || 'ADMIN_PARTNERS.ERROR',
        'danger',
      );
    } finally {
      this.saving = false;
    }
  }

  private async showToast(keyOrMessage: string, color: 'success' | 'danger'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message: this.translate.instant(keyOrMessage),
      duration: 2500,
      color,
      position: 'top',
    });
    await toast.present();
  }

  goBack(): void {
    this.location.back();
  }
}
