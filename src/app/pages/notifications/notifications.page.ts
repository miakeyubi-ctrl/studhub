import { Component, OnDestroy, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import {
  InboxNotification,
  NotifType,
  NotificationsInboxService,
} from '../../services/notifications-inbox.service';

@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.page.html',
  styleUrls: ['./notifications.page.scss'],
  standalone: false,
})
export class NotificationsPage implements OnInit, OnDestroy {
  items: InboxNotification[] = [];
  private sub?: Subscription;

  constructor(
    private location: Location,
    private router: Router,
    private inbox: NotificationsInboxService,
    private alertCtrl: AlertController,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    this.sub = this.inbox.notifications$.subscribe(list => {
      this.items = [...list].sort((a, b) => b.createdAt - a.createdAt);
    });
    void this.inbox.sync();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  goBack(): void {
    if (window.history.length > 1) {
      this.location.back();
      return;
    }
    void this.router.navigateByUrl('/tabs/tab3');
  }

  get unreadCount(): number {
    return this.items.filter(n => !n.read).length;
  }

  iconFor(type: NotifType): string {
    switch (type) {
      case 'message': return 'chatbubble-ellipses-outline';
      case 'favorite': return 'heart-outline';
      case 'promo': return 'gift-outline';
      case 'alert': return 'warning-outline';
      case 'call': return 'call-outline';
      default: return 'notifications-outline';
    }
  }

  iconBg(type: NotifType): string {
    switch (type) {
      case 'message': return 'bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300';
      case 'favorite': return 'bg-rose-50 text-rose-500 dark:bg-rose-500/15 dark:text-rose-300';
      case 'promo': return 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300';
      case 'alert': return 'bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300';
      case 'call': return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300';
      default: return 'bg-primary-50 text-primary-600 dark:bg-primary-800 dark:text-primary-200';
    }
  }

  relativeTime(ts: number): string {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return this.translate.instant('NOTIFICATIONS_PAGE.JUST_NOW');
    if (mins < 60) return this.translate.instant('NOTIFICATIONS_PAGE.MINUTES_AGO', { n: mins });
    const hours = Math.floor(mins / 60);
    if (hours < 24) return this.translate.instant('NOTIFICATIONS_PAGE.HOURS_AGO', { n: hours });
    const days = Math.floor(hours / 24);
    return this.translate.instant('NOTIFICATIONS_PAGE.DAYS_AGO', { n: days });
  }

  openItem(item: InboxNotification): void {
    this.inbox.markRead(item.id);
    if (item.route) {
      void this.router.navigateByUrl(item.route);
    }
  }

  markAllRead(): void {
    this.inbox.markAllRead();
  }

  async confirmClear(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: this.translate.instant('NOTIFICATIONS_PAGE.CLEAR_TITLE'),
      message: this.translate.instant('NOTIFICATIONS_PAGE.CLEAR_MESSAGE'),
      buttons: [
        { text: this.translate.instant('COMMON.CANCEL'), role: 'cancel' },
        {
          text: this.translate.instant('NOTIFICATIONS_PAGE.CLEAR_CONFIRM'),
          role: 'destructive',
          handler: () => this.inbox.clearAll(),
        },
      ],
    });
    await alert.present();
  }

  remove(item: InboxNotification, event: Event): void {
    event.stopPropagation();
    this.inbox.remove(item.id);
  }
}
