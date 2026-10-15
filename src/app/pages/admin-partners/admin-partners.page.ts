import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { Partner, PartnersService } from '../../services/partners.service';

Chart.register(...registerables);

@Component({
  selector: 'app-admin-partners',
  templateUrl: './admin-partners.page.html',
  styleUrls: ['./admin-partners.page.scss'],
  standalone: false,
})
export class AdminPartnersPage implements AfterViewInit, OnDestroy {
  @ViewChild('statsChart') chartCanvas?: ElementRef<HTMLCanvasElement>;

  loading = true;
  error = false;
  search = '';
  partners: Partner[] = [];
  totals = { partners: 0, views: 0, likes: 0, clicks: 0 };

  private chart?: Chart;
  private viewReady = false;

  constructor(
    private router: Router,
    private partnersService: PartnersService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private translate: TranslateService,
  ) {}

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.renderChart();
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
    this.chart = undefined;
  }

  ionViewWillEnter(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.error = false;
    this.loading = true;
    try {
      this.partners = await this.partnersService.adminList();
      this.totals = this.partnersService.statsFromList(this.partners);
      this.renderChart();
    } catch {
      this.error = true;
    } finally {
      this.loading = false;
      // Chart canvas peut n'être visible qu'après *ngIf
      setTimeout(() => this.renderChart(), 50);
    }
  }

  get filtered(): Partner[] {
    const q = this.search.trim().toLowerCase();
    if (!q) return this.partners;
    return this.partners.filter(p =>
      [p.name, p.category, p.offer].some(v => v.toLowerCase().includes(q)),
    );
  }

  isExpired(p: Partner): boolean {
    return !!p.validUntil && new Date(p.validUntil).getTime() < Date.now();
  }

  status(p: Partner): { label: string; cls: string } {
    if (!p.isActive) return { label: 'ADMIN_PARTNERS.INACTIVE', cls: 'bg-slate-100 text-slate-500' };
    if (this.isExpired(p)) return { label: 'ADMIN_PARTNERS.EXPIRED', cls: 'bg-red-50 text-red-600' };
    return { label: 'ADMIN_PARTNERS.ACTIVE', cls: 'bg-primary-50 text-primary-700' };
  }

  addPartner(): void {
    void this.router.navigate(['/admin/partners/new']);
  }

  editPartner(id: number): void {
    void this.router.navigate(['/admin/partners', id]);
  }

  async toggleActive(p: Partner, event: Event): Promise<void> {
    event.stopPropagation();
    try {
      const updated = await this.partnersService.update(p.id, { isActive: !p.isActive });
      p.isActive = updated.isActive;
    } catch {
      await this.showToast('ADMIN_PARTNERS.ERROR', 'danger');
    }
  }

  async confirmDelete(p: Partner, event: Event): Promise<void> {
    event.stopPropagation();
    const alert = await this.alertCtrl.create({
      header: this.translate.instant('ADMIN_PARTNERS.CONFIRM_DELETE_TITLE'),
      message: `${p.name} — ${this.translate.instant('ADMIN_PARTNERS.CONFIRM_DELETE_DESC')}`,
      buttons: [
        { text: this.translate.instant('COMMON.CANCEL'), role: 'cancel' },
        {
          text: this.translate.instant('COMMON.DELETE'),
          role: 'destructive',
          handler: () => { void this.delete(p); },
        },
      ],
    });
    await alert.present();
  }

  private async delete(p: Partner): Promise<void> {
    try {
      await this.partnersService.remove(p.id);
      this.partners = this.partners.filter(x => x.id !== p.id);
      this.totals = this.partnersService.statsFromList(this.partners);
      this.renderChart();
      await this.showToast('ADMIN_PARTNERS.DELETED', 'success');
    } catch {
      await this.showToast('ADMIN_PARTNERS.ERROR', 'danger');
    }
  }

  private renderChart(): void {
    if (!this.viewReady || !this.chartCanvas?.nativeElement) return;

    const labels = [
      this.translate.instant('ADMIN_PARTNERS.STAT_VIEWS'),
      this.translate.instant('ADMIN_PARTNERS.STAT_LIKES'),
      this.translate.instant('ADMIN_PARTNERS.STAT_CLICKS'),
    ];
    const data = [this.totals.views, this.totals.likes, this.totals.clicks];

    const config: ChartConfiguration<'doughnut'> = {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: ['#2e9da6', '#f59e0b', '#6366f1'],
          borderWidth: 0,
          hoverOffset: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: 12, padding: 14, font: { size: 11 } },
          },
        },
      },
    };

    if (this.chart) {
      this.chart.data.labels = labels;
      this.chart.data.datasets[0].data = data;
      this.chart.update();
      return;
    }

    this.chart = new Chart(this.chartCanvas.nativeElement, config);
  }

  private async showToast(key: string, color: 'success' | 'danger'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message: this.translate.instant(key),
      duration: 2000,
      color,
      position: 'top',
    });
    await toast.present();
  }

  goBack(): void {
    void this.router.navigateByUrl('/admin');
  }
}
