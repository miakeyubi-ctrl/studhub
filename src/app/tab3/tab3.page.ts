import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription, combineLatest } from 'rxjs';
import { ThemeService } from '../services/theme.service';
import { LanguageService } from '../services/language.service';
import { AgentAuthService } from '../services/agent-auth.service';
import { AuthService } from '../services/auth.service';
import { MessagesService } from '../services/messages.service';
import { MockDataService, Property } from '../services/mock-data.service';
import { NotificationsInboxService } from '../services/notifications-inbox.service';
import { Partner, PartnersService } from '../services/partners.service';
import { Reservation, ReservationsService } from '../services/reservations.service';
import { hasRealAvatar, initialsBg, initialsFromName } from '../utils/avatar.util';

interface MenuItem {
  icon: string;
  label: string;
  route?: string;
  badge?: number;
  danger?: boolean;
  action?: 'logout';
}

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
  standalone: false,
})
export class Tab3Page implements OnInit, OnDestroy {

  loading = true;
  userName = 'Visiteur';
  userEmail = '';
  userUniversity = '';
  userAvatar = '';
  userInitials = 'V';
  avatarBg = '#0f766e';
  hasAvatar = false;
  isLoggedIn = false;
  isAgent = false;

  private userSub?: Subscription;
  private agentSub?: Subscription;
  private favoritesSub?: Subscription;
  private partnersSub?: Subscription;
  private notifSub?: Subscription;

  stats = [
    { label: 'PROFILE_PAGE.STATS_FAVORITES', value: 0 },
    { label: 'PROFILE_PAGE.STATS_RESERVATIONS', value: 0 },
    { label: 'PROFILE_PAGE.STATS_REVIEWS', value: 0 }
  ];

  favoris: Property[] = [];
  reservations: Reservation[] = [];
  private extrasToken = 0;

  partners: Partner[] = [];
  isAdmin = false;

  menuItems: MenuItem[] = [
    { icon: 'heart-outline', label: 'PROFILE_PAGE.FAVORITES_TITLE', route: '/favorites' },
    { icon: 'chatbubbles-outline', label: 'PROFILE_PAGE.MENU_MESSAGES', route: '/messages' },
    { icon: 'notifications-outline', label: 'PROFILE_PAGE.MENU_NOTIFICATIONS', route: '/notifications' },
    { icon: 'person-outline', label: 'PROFILE_PAGE.MENU_EDIT_PROFILE', route: '/edit-profile' },
    { icon: 'flag-outline', label: 'PROFILE_PAGE.MENU_REPORTS', route: '/my-reports' },
    { icon: 'shield-checkmark-outline', label: 'PROFILE_PAGE.MENU_PRIVACY', route: '/privacy-security' },
    { icon: 'help-circle-outline', label: 'PROFILE_PAGE.MENU_HELP', route: '/help-support' },
    { icon: 'trash-outline', label: 'PRIVACY_PAGE.DELETE_ACCOUNT', danger: true, route: '/privacy-security' },
    { icon: 'log-out-outline', label: 'PROFILE_PAGE.MENU_LOGOUT', danger: true, action: 'logout' }
  ];

  constructor(
    public theme: ThemeService,
    public language: LanguageService,
    public agentAuth: AgentAuthService,
    private auth: AuthService,
    private router: Router,
    private messagesService: MessagesService,
    private data: MockDataService,
    private partnersService: PartnersService,
    private notificationsInbox: NotificationsInboxService,
    private reservationsApi: ReservationsService,
  ) {}

  ngOnInit(): void {
    this.refreshProfile();
    this.userSub = this.auth.user$.subscribe(() => this.refreshProfile());
    this.agentSub = this.agentAuth.agent$.subscribe(() => this.refreshProfile());
    this.favoritesSub = combineLatest([this.data.properties$, this.data.favorites$]).subscribe(() => {
      this.favoris = this.data.getFavoriteProperties().slice(0, 8);
      this.stats[0].value = this.data.favorites.size;
    });
    void this.auth.hydrateFromApi();
    void this.agentAuth.hydrateFromApi();
    void this.notificationsInbox.sync();
    void this.data.loadProperties().catch(() => {});
    this.partnersSub = this.partnersService.partners$.subscribe(list => this.partners = list.slice(0, 8));

    // Le squelette reste affiché tant que les partenaires ne sont pas chargés (min. 900 ms)
    const minDelay = new Promise(resolve => setTimeout(resolve, 900));
    const partnersLoaded = this.partnersService.loadPartners().catch(() => []);
    void Promise.all([minDelay, partnersLoaded]).then(() => this.loading = false);

    const messagerieItem = this.menuItems.find(item => item.route === '/messages');
    const totalUnread = this.messagesService.conversations.reduce((sum, c) => sum + c.unreadCount, 0);

    if (messagerieItem && totalUnread > 0) {
      messagerieItem.badge = totalUnread;
    }

    this.notifSub = this.notificationsInbox.notifications$.subscribe(() => {
      const notifItem = this.menuItems.find(item => item.route === '/notifications');
      if (!notifItem) return;
      const count = this.notificationsInbox.unreadCount;
      notifItem.badge = count > 0 ? count : undefined;
    });
  }

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
    this.agentSub?.unsubscribe();
    this.favoritesSub?.unsubscribe();
    this.partnersSub?.unsubscribe();
    this.notifSub?.unsubscribe();
  }

  private refreshProfile(): void {
    const user = this.auth.currentUser;
    const agent = this.agentAuth.currentAgent;
    this.isAdmin = this.auth.isAdmin;

    if (user) {
      this.isLoggedIn = true;
      this.isAgent = false;
      this.isAdmin = this.auth.isAdmin;
      this.userName = user.fullName?.trim() || user.email.split('@')[0];
      this.userEmail = user.email;
      this.userUniversity = this.isAdmin
        ? 'Administrateur'
        : (user.university?.trim() || '');
      this.userAvatar = user.avatarUrl || '';
      this.hasAvatar = hasRealAvatar(user.avatarUrl);
      this.userInitials = initialsFromName(user.fullName, user.email);
      this.avatarBg = initialsBg(user.fullName, user.email);
      void this.loadAccountExtras();
      return;
    }

    this.reservations = [];
    this.stats[1].value = 0;
    this.stats[2].value = 0;

    if (agent) {
      this.isLoggedIn = true;
      this.isAgent = true;
      this.userName = agent.agencyName?.trim() || agent.fullName?.trim() || agent.email.split('@')[0];
      this.userEmail = agent.email;
      this.userUniversity = agent.agencyName?.trim() || 'Agent immobilier';
      this.userAvatar = agent.avatarUrl || '';
      this.hasAvatar = hasRealAvatar(agent.avatarUrl);
      this.userInitials = initialsFromName(agent.fullName || agent.agencyName, agent.email);
      this.avatarBg = initialsBg(agent.fullName || agent.agencyName, agent.email);
      return;
    }

    this.isLoggedIn = false;
    this.isAgent = false;
    this.userName = 'Visiteur';
    this.userEmail = '';
    this.userUniversity = '';
    this.userAvatar = '';
    this.hasAvatar = false;
    this.userInitials = 'V';
    this.avatarBg = '#0f766e';
  }

  private readonly adminMenuItem: MenuItem = {
    icon: 'briefcase-outline', label: 'PROFILE_PAGE.MENU_ADMIN_PARTNERS', route: '/admin/partners',
  };

  get visibleMenuItems(): MenuItem[] {
    // Admin a son propre espace (/admin) — pas le menu étudiant ni agent
    if (this.isAdmin) {
      return [
        this.adminMenuItem,
        { icon: 'shield-outline', label: 'ADMIN_HOME.TITLE', route: '/admin' },
        { icon: 'log-out-outline', label: 'PROFILE_PAGE.MENU_LOGOUT', danger: true, action: 'logout' },
      ];
    }
    if (!this.isAgent) return this.menuItems;
    return this.menuItems.filter(item => item.route !== '/edit-profile');
  }

  private async loadAccountExtras(): Promise<void> {
    if (!this.auth.currentUser) return;
    const token = ++this.extrasToken;
    try {
      const [reservations, reviewCount] = await Promise.all([
        this.reservationsApi.loadMine(),
        this.data.loadMyReviewCount(),
      ]);
      if (token !== this.extrasToken || !this.auth.currentUser) return;
      this.reservations = reservations;
      this.stats[1].value = reservations.length;
      this.stats[2].value = reviewCount;
    } catch {
      /* le profil reste affiché même si ces compteurs échouent */
    }
  }

  openPartner(id: number): void {
    void this.router.navigate(['/partners', id]);
  }

  onMenuClick(item: MenuItem, event: Event): void {
    if (item.action === 'logout') {
      event.preventDefault();
      this.auth.logout();
      this.agentAuth.logout();
      this.router.navigateByUrl('/login', { replaceUrl: true });
    }
  }

  openFavori(id: number): void {
    void this.router.navigate(['/detailsimmo', id]);
  }

  statusLabel(status: Reservation['status']): string {
    switch (status) {
      case 'confirmee': return 'PROFILE_PAGE.STATUS_CONFIRMED';
      case 'attente': return 'PROFILE_PAGE.STATUS_PENDING';
      case 'terminee': return 'PROFILE_PAGE.STATUS_DONE';
    }
  }

  statusClass(status: Reservation['status']): string {
    switch (status) {
      case 'confirmee': return 'bg-primary-50 text-primary-700';
      case 'attente': return 'bg-amber-50 text-amber-600';
      case 'terminee': return 'bg-slate-100 text-slate-500';
    }
  }

  async removeFavori(id: number, event: Event): Promise<void> {
    event.stopPropagation();
    await this.data.toggleFavorite(id);
  }

}
