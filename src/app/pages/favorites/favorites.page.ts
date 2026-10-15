import { Component, OnDestroy, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription, combineLatest } from 'rxjs';
import { MockDataService, Product, Property, ServiceProvider } from '../../services/mock-data.service';

type FavTab = 'immo' | 'product' | 'service';

@Component({
  selector: 'app-favorites',
  templateUrl: './favorites.page.html',
  styleUrls: ['./favorites.page.scss'],
  standalone: false,
})
export class FavoritesPage implements OnInit, OnDestroy {
  loading = true;
  tab: FavTab = 'immo';
  favorites: Property[] = [];
  productFavorites: Product[] = [];
  providerFavorites: ServiceProvider[] = [];
  private sub?: Subscription;

  constructor(
    private location: Location,
    private router: Router,
    private data: MockDataService,
  ) {}

  ngOnInit(): void {
    this.sub = combineLatest([
      this.data.properties$,
      this.data.products$,
      this.data.providers$,
      this.data.favorites$,
      this.data.productFavorites$,
      this.data.providerFavorites$,
    ]).subscribe(() => {
      this.favorites = this.data.getFavoriteProperties();
      this.productFavorites = this.data.getFavoriteProducts();
      this.providerFavorites = this.data.getFavoriteProviders();
      this.loading = false;
    });
    void Promise.all([
      this.data.loadProperties().catch(() => {}),
      this.data.loadProducts().catch(() => {}),
      this.data.loadProviders().catch(() => {}),
      this.data.hydrateFavoritesFromApi(),
    ]);
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

  setTab(t: FavTab): void {
    this.tab = t;
  }

  openItem(id: number): void {
    if (!id) return;
    void this.router.navigate(['/detailsimmo', id]);
  }

  openProduct(id: number): void {
    if (!id) return;
    void this.router.navigate(['/detailsproduit', id]);
  }

  openProvider(id: number): void {
    if (!id) return;
    void this.router.navigate(['/detailsstudservices', id]);
  }

  async removeFavorite(id: number, event: Event): Promise<void> {
    event.stopPropagation();
    await this.data.toggleFavorite(id);
  }

  async removeProductFavorite(id: number, event: Event): Promise<void> {
    event.stopPropagation();
    await this.data.toggleProductFavorite(id);
  }

  async removeProviderFavorite(id: number, event: Event): Promise<void> {
    event.stopPropagation();
    await this.data.toggleProviderFavorite(id);
  }

  get totalCount(): number {
    return this.favorites.length + this.productFavorites.length + this.providerFavorites.length;
  }
}
