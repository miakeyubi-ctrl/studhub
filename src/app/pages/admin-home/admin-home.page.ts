import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { LanguageService } from '../../services/language.service';

interface AdminMenuItem {
  icon: string;
  label: string;
  route?: string;
  danger?: boolean;
  action?: 'logout';
  soon?: boolean;
}

@Component({
  selector: 'app-admin-home',
  templateUrl: './admin-home.page.html',
  styleUrls: ['./admin-home.page.scss'],
  standalone: false,
})
export class AdminHomePage implements OnInit, OnDestroy {
  name = '';
  email = '';
  avatar =
    'https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=200&auto=format&fit=crop';

  private sub?: Subscription;

  readonly menuItems: AdminMenuItem[] = [
    {
      icon: 'briefcase-outline',
      label: 'ADMIN_HOME.MENU_PARTNERS',
      route: '/admin/partners',
    },
    {
      icon: 'flag-outline',
      label: 'ADMIN_HOME.MENU_REPORTS',
      soon: true,
    },
    {
      icon: 'people-outline',
      label: 'ADMIN_HOME.MENU_ACCOUNTS',
      route: '/admin/accounts',
    },
    {
      icon: 'log-out-outline',
      label: 'ADMIN_HOME.MENU_LOGOUT',
      danger: true,
      action: 'logout',
    },
  ];

  constructor(
    public theme: ThemeService,
    public language: LanguageService,
    private auth: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.refresh();
    this.sub = this.auth.user$.subscribe(() => this.refresh());
    void this.auth.hydrateFromApi();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private refresh(): void {
    const u = this.auth.currentUser;
    if (!u || !this.auth.isAdmin) {
      void this.router.navigateByUrl('/login', { replaceUrl: true });
      return;
    }
    this.name = u.fullName?.trim() || u.email.split('@')[0];
    this.email = u.email;
    if (u.avatarUrl) this.avatar = u.avatarUrl;
  }

  openItem(item: AdminMenuItem): void {
    if (item.action === 'logout') {
      this.auth.logout();
      void this.router.navigateByUrl('/login', { replaceUrl: true });
      return;
    }
    if (item.soon || !item.route) return;
    void this.router.navigateByUrl(item.route);
  }
}
