import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { MockDataService, Property } from '../services/mock-data.service';

interface PropertyCard {
  id: number;
  title: string;
  city: string;
  price: number;
  image: string;
  category: string;
  rating: number;
  viewsCount: number;
  likesCount: number;
}

@Component({
  selector: 'app-tab2',
  templateUrl: './tab2.page.html',
  styleUrls: ['./tab2.page.scss'],
  standalone: false
})
export class Tab2Page implements OnInit, OnDestroy {

  loading = true;
  searchText = '';
  selectedCategory = 'Tous';
  categories = ['Tous', 'Studios', 'Colocations', 'Résidences', 'Chambres'];
  properties: PropertyCard[] = [];

  private propsSub?: Subscription;

  constructor(private data: MockDataService) {}

  ngOnInit() {
    this.sync();
    this.propsSub = this.data.properties$.subscribe(() => this.sync());
    void this.reload();
  }

  ionViewWillEnter(): void {
    void this.data.loadProperties({ limit: 100 }).then(() => this.sync());
  }

  ngOnDestroy(): void {
    this.propsSub?.unsubscribe();
  }

  async reload(event?: CustomEvent): Promise<void> {
    this.loading = true;
    try {
      await this.data.loadProperties({ limit: 100 });
      this.sync();
    } finally {
      this.loading = false;
      (event?.target as HTMLIonRefresherElement | undefined)?.complete?.();
    }
  }

  private sync(): void {
    this.properties = this.data.properties.map((p: Property) => ({
      id: p.id,
      title: p.title,
      city: p.city,
      price: p.price,
      image: p.images?.[0] || '',
      category: p.category,
      rating: p.rating,
      viewsCount: p.viewsCount ?? 0,
      likesCount: p.likesCount ?? 0,
    }));
  }

  onSearchChange(event: any) {
    this.searchText = event.target.value;
  }

  selectCategory(category: string) {
    this.selectedCategory = category;
  }

  async toggleFavorite(id: number, event: Event) {
    event.stopPropagation();
    event.preventDefault();
    await this.data.toggleFavorite(id);
  }

  isFavorite(id: number): boolean {
    return this.data.isFavorite(id);
  }

  async toggleLike(id: number, event: Event) {
    event.stopPropagation();
    event.preventDefault();
    await this.data.togglePropertyLike(id);
    this.sync();
  }

  isLiked(id: number): boolean {
    return this.data.isPropertyLiked(id);
  }

  get filteredProperties(): PropertyCard[] {
    return this.properties.filter(item => {
      const matchesSearch =
        item.title.toLowerCase().includes(this.searchText.toLowerCase()) ||
        item.city.toLowerCase().includes(this.searchText.toLowerCase());
      const matchesCategory =
        this.selectedCategory === 'Tous' ||
        item.category === this.selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }
}
