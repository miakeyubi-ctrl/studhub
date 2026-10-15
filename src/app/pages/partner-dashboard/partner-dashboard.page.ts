import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { Subscription } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { PartnerAccount, PartnerAuthService } from '../../services/partner-auth.service';
import {
  PartnerAnnouncement,
  PartnerAnnouncementInput,
  PartnersService,
} from '../../services/partners.service';
import { ActiveRoleService } from '../../services/active-role.service';
import { ThemeService } from '../../services/theme.service';
import { UploadService } from '../../services/upload.service';

Chart.register(...registerables);

const EMPTY_FORM: PartnerAnnouncementInput = {
  title: '',
  description: '',
  discount: '',
  promoCode: '',
  imageUrl: '',
  isActive: true,
  validUntil: '',
};

@Component({
  selector: 'app-partner-dashboard',
  templateUrl: './partner-dashboard.page.html',
  styleUrls: ['./partner-dashboard.page.scss'],
  standalone: false,
})
export class PartnerDashboardPage implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('statsChart') chartCanvas?: ElementRef<HTMLCanvasElement>;

  partner: PartnerAccount | null = null;
  announcements: PartnerAnnouncement[] = [];
  form: PartnerAnnouncementInput = { ...EMPTY_FORM };
  editingId: number | null = null;
  showForm = false;
  loadingList = false;
  saving = false;
  uploading = false;

  private sub?: Subscription;
  private chart?: Chart;
  private viewReady = false;

  constructor(
    public theme: ThemeService,
    private partnerAuth: PartnerAuthService,
    private partnersService: PartnersService,
    private uploadService: UploadService,
    private activeRole: ActiveRoleService,
    private router: Router,
    private translate: TranslateService,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
  ) {}

  ngOnInit() {
    this.activeRole.set('partner');
    this.partner = this.partnerAuth.currentPartner;
    this.sub = this.partnerAuth.partner$.subscribe((p) => {
      this.partner = p;
      setTimeout(() => this.renderChart(), 40);
    });
    void this.partnerAuth.hydrateFromApi().then(() => {
      setTimeout(() => this.renderChart(), 40);
    });
    void this.loadAnnouncements();
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    setTimeout(() => this.renderChart(), 40);
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
    this.chart?.destroy();
    this.chart = undefined;
  }

  logout() {
    this.partnerAuth.logout();
    this.router.navigateByUrl('/partner-login', { replaceUrl: true });
  }

  async loadAnnouncements(): Promise<void> {
    this.loadingList = true;
    try {
      this.announcements = await this.partnersService.listMyAnnouncements();
    } catch {
      this.announcements = [];
      await this.toast('PARTNER_AUTH.ANNOUNCE_ERROR', 'danger');
    } finally {
      this.loadingList = false;
    }
  }

  openCreate(): void {
    this.editingId = null;
    this.form = { ...EMPTY_FORM, isActive: true };
    this.showForm = true;
  }

  openEdit(a: PartnerAnnouncement): void {
    this.editingId = a.id;
    this.form = {
      title: a.title || '',
      description: a.description || '',
      discount: a.discount || '',
      promoCode: a.promoCode || '',
      imageUrl: a.imageUrl || '',
      isActive: a.isActive !== false,
      validUntil: a.validUntil ? a.validUntil.slice(0, 10) : '',
    };
    this.showForm = true;
  }

  cancelForm(): void {
    this.showForm = false;
    this.editingId = null;
    this.form = { ...EMPTY_FORM };
  }

  get canSave(): boolean {
    return !!(this.form.title || '').trim() && !this.saving;
  }

  async onImageSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.uploading = true;
    try {
      const uploaded = await this.uploadService.uploadFile(file, 'partners');
      this.form.imageUrl = uploaded.url;
    } catch (err) {
      await this.toast(err instanceof Error ? err.message : 'PARTNER_AUTH.ANNOUNCE_ERROR', 'danger');
    } finally {
      this.uploading = false;
      input.value = '';
    }
  }

  async saveAnnouncement(): Promise<void> {
    if (!this.canSave) return;
    this.saving = true;
    const payload: PartnerAnnouncementInput = {
      title: this.form.title.trim(),
      description: (this.form.description || '').trim() || null,
      discount: (this.form.discount || '').trim() || null,
      promoCode: (this.form.promoCode || '').trim() || null,
      imageUrl: (this.form.imageUrl || '').trim() || null,
      isActive: this.form.isActive !== false,
      validUntil: (this.form.validUntil || '').trim() || null,
    };
    try {
      if (this.editingId) {
        await this.partnersService.updateAnnouncement(this.editingId, payload);
      } else {
        await this.partnersService.createAnnouncement(payload);
      }
      await this.toast('PARTNER_AUTH.ANNOUNCE_SAVED', 'success');
      this.cancelForm();
      await this.loadAnnouncements();
    } catch {
      await this.toast('PARTNER_AUTH.ANNOUNCE_ERROR', 'danger');
    } finally {
      this.saving = false;
    }
  }

  async confirmDelete(a: PartnerAnnouncement): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: this.translate.instant('PARTNER_AUTH.ANNOUNCE_DELETE_TITLE'),
      message: a.title,
      buttons: [
        { text: this.translate.instant('COMMON.CANCEL'), role: 'cancel' },
        {
          text: this.translate.instant('COMMON.DELETE'),
          role: 'destructive',
          handler: () => { void this.deleteAnnouncement(a.id); },
        },
      ],
    });
    await alert.present();
  }

  private async deleteAnnouncement(id: number): Promise<void> {
    try {
      await this.partnersService.removeAnnouncement(id);
      this.announcements = this.announcements.filter((x) => x.id !== id);
      await this.toast('PARTNER_AUTH.ANNOUNCE_DELETED', 'success');
    } catch {
      await this.toast('PARTNER_AUTH.ANNOUNCE_ERROR', 'danger');
    }
  }

  private weekSeries(total: number, seed: number): number[] {
    const weights = [0.10, 0.12, 0.14, 0.13, 0.16, 0.18, 0.17];
    const jitter = [0.92, 1.05, 0.97, 1.08, 0.94, 1.10, 1.00];
    const base = Math.max(0, Number(total) || 0);
    const points = weights.map((w, i) => {
      const n = Math.round(base * w * (jitter[(i + seed) % jitter.length]));
      return Math.max(0, n);
    });
    const sum = points.reduce((a, b) => a + b, 0) || 1;
    const scaled = points.map((v) => Math.round((v * base) / sum));
    const diff = base - scaled.reduce((a, b) => a + b, 0);
    scaled[scaled.length - 1] = Math.max(0, scaled[scaled.length - 1] + diff);
    return scaled;
  }

  private renderChart(): void {
    if (!this.viewReady || !this.chartCanvas?.nativeElement || !this.partner) return;

    const labels = [
      this.translate.instant('PARTNER_AUTH.DAY_MON'),
      this.translate.instant('PARTNER_AUTH.DAY_TUE'),
      this.translate.instant('PARTNER_AUTH.DAY_WED'),
      this.translate.instant('PARTNER_AUTH.DAY_THU'),
      this.translate.instant('PARTNER_AUTH.DAY_FRI'),
      this.translate.instant('PARTNER_AUTH.DAY_SAT'),
      this.translate.instant('PARTNER_AUTH.DAY_SUN'),
    ];

    const seed = Number(this.partner.id) || 1;
    const views = this.weekSeries(Number(this.partner.viewsCount || 0), seed);
    const likes = this.weekSeries(Number(this.partner.likesCount || 0), seed + 1);
    const clicks = this.weekSeries(Number(this.partner.clicksCount || 0), seed + 2);

    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: this.translate.instant('ADMIN_PARTNERS.STAT_VIEWS'),
            data: views,
            borderColor: '#2e9da6',
            backgroundColor: 'rgba(46, 157, 166, 0.12)',
            tension: 0.35,
            fill: true,
            pointRadius: 3,
            pointHoverRadius: 5,
            borderWidth: 2.5,
          },
          {
            label: this.translate.instant('ADMIN_PARTNERS.STAT_LIKES'),
            data: likes,
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245, 158, 11, 0.10)',
            tension: 0.35,
            fill: true,
            pointRadius: 3,
            pointHoverRadius: 5,
            borderWidth: 2.5,
          },
          {
            label: this.translate.instant('ADMIN_PARTNERS.STAT_CLICKS'),
            data: clicks,
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99, 102, 241, 0.10)',
            tension: 0.35,
            fill: true,
            pointRadius: 3,
            pointHoverRadius: 5,
            borderWidth: 2.5,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: 12, padding: 14, font: { size: 11 } },
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 11 } } },
          y: {
            beginAtZero: true,
            ticks: { precision: 0, font: { size: 10 } },
            grid: { color: 'rgba(148, 163, 184, 0.25)' },
          },
        },
      },
    };

    if (this.chart) {
      this.chart.data.labels = labels;
      this.chart.data.datasets = config.data.datasets;
      this.chart.update();
      return;
    }

    this.chart = new Chart(this.chartCanvas.nativeElement, config);
  }

  private async toast(key: string, color: 'success' | 'danger'): Promise<void> {
    const t = await this.toastCtrl.create({
      message: this.translate.instant(key),
      duration: 2200,
      color,
      position: 'top',
    });
    await t.present();
  }
}
