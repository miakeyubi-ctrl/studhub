import { Component, OnDestroy, OnInit } from '@angular/core';
import Splide from '@splidejs/splide';
import { Subscription } from 'rxjs';
import { ThemeService } from '../services/theme.service';
import { MessagesService } from '../services/messages.service';
import { AuthService, StudUser } from '../services/auth.service';
import { MockDataService } from '../services/mock-data.service';
import { hasRealAvatar, initialsBg, initialsFromName } from '../utils/avatar.util';

interface Property {
  id: number;
  title: string;
  city: string;
  price: number;
  image: string;
  category: string;
  viewsCount: number;
  likesCount: number;
}

interface Product {
  id: number;
  title: string;
  price: number;
  image: string;
  category: string;
  condition: string;
}

interface Prestataire {
  id: number;
  name: string;
  profession: string;
  tier: 'Gratuit' | 'Standard' | 'Premium';
  rating: number;
  image: string;
}

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: false,
})
export class Tab1Page implements OnInit, OnDestroy {

  constructor(
    public theme: ThemeService,
    private messagesService: MessagesService,
    private auth: AuthService,
    private data: MockDataService,
  ) {}

  unreadMessages = 0;
  loading = true;

  userName = 'Visiteur';
  userAvatar = '';
  userInitials = 'V';
  avatarBg = '#0f766e';
  hasAvatar = false;

  private userSub?: Subscription;
  private propsSub?: Subscription;
  private productsSub?: Subscription;
  private msgSub?: Subscription;

  categories = ['Tous', 'Studios', 'Colocations', 'Résidences', 'Chambres'];
  selectedCategory = 'Tous';

  featured: Property[] = [];
  recentlyViewed: Property[] = [];

  products: Product[] = [];
  prestataires: Prestataire[] = [];

  tierClass(tier: Prestataire['tier']): string {
    switch (tier) {
      case 'Premium': return 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400';
      case 'Standard': return 'bg-primary-50 dark:bg-primary-700/40 text-primary-700 dark:text-primary-200';
      case 'Gratuit': return 'bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-300';
    }
  }

  async toggleFavorite(id: number, event: Event): Promise<void> {
    event.stopPropagation();
    event.preventDefault();
    await this.data.toggleFavorite(id);
  }

  isFavorite(id: number): boolean {
    return this.data.isFavorite(id);
  }

  async toggleLike(id: number, event: Event): Promise<void> {
    event.stopPropagation();
    event.preventDefault();
    await this.data.togglePropertyLike(id);
    this.syncFromDataService();
  }

  isLiked(id: number): boolean {
    return this.data.isPropertyLiked(id);
  }

  selectCategory(category: string): void {
    this.selectedCategory = category;
  }

  get filteredFeatured(): Property[] {
    if (this.selectedCategory === 'Tous') {
      return this.featured;
    }

    return this.featured.filter(p => p.category === this.selectedCategory);
  }

  ngOnInit(): void {
    this.applyUser(this.auth.currentUser);
    this.userSub = this.auth.user$.subscribe(u => this.applyUser(u));
    void this.auth.hydrateFromApi();

    this.unreadMessages = this.messagesService.totalUnread;
    this.msgSub = this.messagesService.conversations$.subscribe(() => {
      this.unreadMessages = this.messagesService.totalUnread;
    });
    void this.messagesService.getConversations();

    this.syncFromDataService();
    this.propsSub = this.data.properties$.subscribe(() => this.syncFromDataService());
    this.productsSub = this.data.products$.subscribe(() => this.syncFromDataService());
    void this.data.loadAllFromBackend().then(() => this.syncFromDataService());

    setTimeout(() => this.mountPromoCarousel(), 0);

    setTimeout(() => {
      this.loading = false;
      setTimeout(() => this.mountCarousel(), 0);
    }, 900);
  }

  ionViewWillEnter(): void {
    this.unreadMessages = this.messagesService.totalUnread;
    void this.messagesService.getConversations();
    void this.data.loadAllFromBackend().then(() => this.syncFromDataService());
  }

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
    this.propsSub?.unsubscribe();
    this.productsSub?.unsubscribe();
    this.msgSub?.unsubscribe();
  }

  private syncFromDataService(): void {
    const props = this.data.properties.map(p => ({
      id: p.id,
      title: p.title,
      city: p.city,
      price: p.price,
      image: p.images?.[0] || '',
      category: p.category,
      viewsCount: p.viewsCount ?? 0,
      likesCount: p.likesCount ?? 0,
    }));
    this.featured = props.slice(0, 6);
    this.recentlyViewed = props.slice(0, 4);

    this.products = this.data.products.slice(0, 6).map(p => ({
      id: p.id,
      title: p.title,
      price: p.price,
      image: p.images?.[0] || '',
      category: p.category,
      condition: p.condition,
    }));

    this.prestataires = this.data.prestataires.slice(0, 6).map(p => ({
      id: p.id,
      name: p.name,
      profession: p.profession,
      tier: p.tier,
      rating: p.rating,
      image: p.images?.[0] || '',
    }));
  }

  private applyUser(user: StudUser | null): void {
    if (!user) {
      this.userName = 'Visiteur';
      this.userAvatar = '';
      this.hasAvatar = false;
      this.userInitials = 'V';
      this.avatarBg = '#0f766e';
      return;
    }
    this.userName = user.fullName?.trim() || user.email.split('@')[0];
    this.userAvatar = user.avatarUrl || '';
    this.hasAvatar = hasRealAvatar(user.avatarUrl);
    this.userInitials = initialsFromName(user.fullName, user.email);
    this.avatarBg = initialsBg(user.fullName, user.email);
  }

  private mountPromoCarousel(): void {

    new Splide('#promo-carousel', {
      type: 'loop',
      perPage: 1,
      autoplay: true,
      interval: 4000,
      pagination: true,
      arrows: false,
    }).mount();

  }

  private mountCarousel(): void {

    new Splide('#featured-carousel', {
      type: 'loop',
      perPage: 1,
      gap: '1rem',
      autoplay: true,
      pagination: true,
      arrows: false,
    }).mount();

  }
}
