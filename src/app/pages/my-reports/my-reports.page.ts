import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { ReportsService, UserReport } from '../../services/reports.service';

@Component({
  selector: 'app-my-reports',
  templateUrl: './my-reports.page.html',
  styleUrls: ['./my-reports.page.scss'],
  standalone: false,
})
export class MyReportsPage implements OnInit {
  loading = true;
  error = false;
  items: UserReport[] = [];

  constructor(
    private location: Location,
    private router: Router,
    private reports: ReportsService,
  ) {}

  ngOnInit(): void {
    void this.load();
  }

  goBack(): void {
    if (window.history.length > 1) {
      this.location.back();
      return;
    }
    void this.router.navigateByUrl('/tabs/tab3');
  }

  async load(): Promise<void> {
    this.loading = true;
    this.error = false;
    try {
      this.items = await this.reports.listMine();
    } catch {
      this.error = true;
      this.items = [];
    } finally {
      this.loading = false;
    }
  }

  openTarget(item: UserReport): void {
    if (!item.targetRoute) return;
    void this.router.navigateByUrl(item.targetRoute);
  }

  goHelp(): void {
    void this.router.navigateByUrl('/help-support');
  }

  reasonKey(reason: string): string {
    const map: Record<string, string> = {
      scam: 'REPORT.REASON_SCAM',
      fake: 'REPORT.REASON_FAKE',
      spam: 'REPORT.REASON_SPAM',
      wrong_info: 'REPORT.REASON_WRONG',
      inappropriate: 'REPORT.REASON_INAPPROPRIATE',
      duplicate: 'REPORT.REASON_DUPLICATE',
      other: 'REPORT.REASON_OTHER',
    };
    return map[reason] || 'REPORT.REASON_OTHER';
  }

  typeKey(type: string): string {
    switch (type) {
      case 'PRODUCT': return 'MY_REPORTS.TYPE_PRODUCT';
      case 'PROVIDER': return 'MY_REPORTS.TYPE_PROVIDER';
      default: return 'MY_REPORTS.TYPE_PROPERTY';
    }
  }

  typeIcon(type: string): string {
    switch (type) {
      case 'PRODUCT': return 'bag-handle-outline';
      case 'PROVIDER': return 'construct-outline';
      default: return 'home-outline';
    }
  }

  formatDate(iso: string): string {
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  }
}
