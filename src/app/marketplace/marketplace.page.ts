import { Component, OnDestroy, OnInit } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { StudentMenuService } from '../services/student-menu.service';
import { MockDataService, Product as DataProduct } from '../services/mock-data.service';
import { UploadService } from '../services/upload.service';
import { Router } from '@angular/router';

interface Product {
  id: number;
  title: string;
  category: string;
  price: number;
  image: string;
  seller: string;
  city: string;
  condition: string;
  negotiable?: boolean;
  description?: string;
  viewsCount?: number;
  likesCount?: number;
}

const NO_PHOTO_PLACEHOLDER =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'>" +
  "<rect width='400' height='300' fill='%23EFFBFC'/>" +
  "<g fill='%2356C8D1' opacity='0.35'>" +
  "<circle cx='140' cy='110' r='28'/>" +
  "<path d='M40 260 L160 150 L230 210 L280 160 L360 260 Z'/>" +
  "</g></svg>";

@Component({
  selector: 'app-marketplace',
  templateUrl: 'marketplace.page.html',
  styleUrls: ['marketplace.page.scss'],
  standalone: false,
})
export class MarketplacePage implements OnInit, OnDestroy {

  loading = true;
  searchText = '';
  selectedCategory = 'Tous';

  categories = [
    'Tous',
    'Électronique',
    'Meubles',
    'Vêtements',
    'Livres',
    'Autres'
  ];

  sellCategories = this.categories.filter(c => c !== 'Tous');
  conditions = ['Neuf', 'Très bon état', 'Bon état'];

  products: Product[] = [];

  showSellModal = false;
  sellLoading = false;
  sellError = '';

  sellForm = {
    title: '',
    category: '',
    condition: '',
    price: null as number | null,
    negotiable: false,
    city: '',
    description: '',
    photoDataUrl: null as string | null,
    photoFile: null as File | null,
  };

  private productsSub?: Subscription;

  constructor(
    private toastController: ToastController,
    private translate: TranslateService,
    private auth: AuthService,
    private studentMenu: StudentMenuService,
    private data: MockDataService,
    private upload: UploadService,
    private router: Router,
  ) {}

  get menuInitial(): string {
    const name = this.auth.currentUser?.fullName?.trim();
    return name ? name.charAt(0).toUpperCase() : '';
  }

  openMenu(): void {
    this.studentMenu.open();
  }

  ngOnInit() {
    this.syncProducts(this.data.products);
    this.productsSub = this.data.products$.subscribe((list) => this.syncProducts(list));
    void this.reload();
  }

  ionViewWillEnter(): void {
    void this.data.loadProducts({ limit: 100 }).then(() => this.syncProducts(this.data.products));
  }

  ngOnDestroy(): void {
    this.productsSub?.unsubscribe();
  }

  async reload(event?: CustomEvent): Promise<void> {
    this.loading = true;
    try {
      await this.data.loadProducts({ limit: 100 });
      this.syncProducts(this.data.products);
    } finally {
      this.loading = false;
      (event?.target as HTMLIonRefresherElement | undefined)?.complete?.();
    }
  }

  trackByProductId(_index: number, product: Product): number {
    return product.id;
  }

  private syncProducts(list: DataProduct[]): void {
    const mapped = list.map((p) => ({
      id: p.id,
      title: p.title,
      category: p.category,
      price: p.price,
      image: p.images?.[0] || NO_PHOTO_PLACEHOLDER,
      seller: p.seller?.name || 'Vendeur',
      city: p.city,
      condition: p.condition,
      negotiable: p.negotiable,
      description: p.description,
      viewsCount: p.viewsCount ?? 0,
      likesCount: p.likesCount ?? 0,
    }));
    if (
      this.products.length === mapped.length &&
      this.products.every((p, i) =>
        p.id === mapped[i].id &&
        p.image === mapped[i].image &&
        p.price === mapped[i].price &&
        p.likesCount === mapped[i].likesCount &&
        p.viewsCount === mapped[i].viewsCount &&
        p.title === mapped[i].title,
      )
    ) {
      return;
    }
    this.products = mapped;
  }

  selectCategory(category: string) {
    this.selectedCategory = category;
  }

  onSearchChange(event: any) {
    this.searchText = event.target.value;
  }

  get filteredProducts(): Product[] {
    return this.products.filter(item => {
      const matchesSearch =
        item.title.toLowerCase().includes(this.searchText.toLowerCase()) ||
        item.city.toLowerCase().includes(this.searchText.toLowerCase());

      const matchesCategory =
        this.selectedCategory === 'Tous' ||
        item.category === this.selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }

  openSellModal() {
    if (!this.auth.isLoggedIn) {
      void this.router.navigateByUrl('/login');
      return;
    }
    this.sellError = '';
    this.sellForm = {
      title: '',
      category: '',
      condition: '',
      price: null,
      negotiable: false,
      city: '',
      description: '',
      photoDataUrl: null,
      photoFile: null,
    };
    this.showSellModal = true;
  }

  closeSellModal() {
    this.showSellModal = false;
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.sellForm.photoFile = file;

    const reader = new FileReader();
    reader.onload = () => {
      this.sellForm.photoDataUrl = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  async publishProduct() {
    this.sellError = '';

    const { title, category, condition, price, city } = this.sellForm;

    if (!title.trim() || !category || !condition || !price || price <= 0 || !city.trim()) {
      this.sellError = 'MARKETPLACE_PAGE.SELL_ERROR_REQUIRED';
      return;
    }

    if (!this.auth.isLoggedIn) {
      void this.router.navigateByUrl('/login');
      return;
    }

    this.sellLoading = true;

    const me = this.auth.currentUser;
    const sellerId = me?.id ? Number(me.id) : 0;
    let imageUrls: string[] = [];

    try {
      if (this.sellForm.photoFile) {
        const uploaded = await this.upload.uploadFile(this.sellForm.photoFile, 'products');
        if (uploaded?.url) imageUrls = [uploaded.url];
      }

      const created = await this.data.createProduct({
        title: title.trim(),
        category,
        condition,
        price,
        negotiable: this.sellForm.negotiable,
        city: city.trim(),
        description: this.sellForm.description.trim() || '',
        images: imageUrls,
        specs: [],
        sellerId,
      });
      if (!created) {
        this.sellError = 'MARKETPLACE_PAGE.SELL_ERROR_REQUIRED';
        return;
      }
      await this.data.loadProducts();
      this.syncProducts(this.data.products);
      this.showSellModal = false;

      const toast = await this.toastController.create({
        message: this.translate.instant('MARKETPLACE_PAGE.SELL_SUCCESS'),
        duration: 2500,
        color: 'success',
        position: 'top'
      });
      await toast.present();
    } catch (e: any) {
      this.sellError = typeof e?.message === 'string' ? e.message : 'MARKETPLACE_PAGE.SELL_ERROR_REQUIRED';
    } finally {
      this.sellLoading = false;
    }
  }
}
