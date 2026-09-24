import { Component, OnInit } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';

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
export class MarketplacePage implements OnInit {

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

  products: Product[] = [
    {
      id: 1,
      title: 'iPhone 12 - 128 Go',
      category: 'Électronique',
      price: 950,
      image: 'https://images.unsplash.com/photo-1592286927505-1def25115558?q=80&w=600&auto=format&fit=crop',
      seller: 'Amine K.',
      city: 'Tunis',
      condition: 'Très bon état'
    },
    {
      id: 2,
      title: 'Ordinateur portable Dell',
      category: 'Électronique',
      price: 1200,
      image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?q=80&w=600&auto=format&fit=crop',
      seller: 'Salma T.',
      city: 'Sfax',
      condition: 'Bon état'
    },
    {
      id: 3,
      title: 'Bureau + chaise étudiant',
      category: 'Meubles',
      price: 180,
      image: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?q=80&w=600&auto=format&fit=crop',
      seller: 'Mohamed A.',
      city: 'Sousse',
      condition: 'Bon état'
    },
    {
      id: 4,
      title: 'Veste d\'hiver taille M',
      category: 'Vêtements',
      price: 45,
      image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=600&auto=format&fit=crop',
      seller: 'Nour H.',
      city: 'Ariana',
      condition: 'Neuf'
    },
    {
      id: 5,
      title: 'Lot de livres - Génie Informatique',
      category: 'Livres',
      price: 60,
      image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=600&auto=format&fit=crop',
      seller: 'Yassine B.',
      city: 'Tunis, El Manar',
      condition: 'Bon état'
    },
    {
      id: 6,
      title: 'Étagère de rangement',
      category: 'Meubles',
      price: 90,
      image: 'https://images.unsplash.com/photo-1594620302200-9a762244a156?q=80&w=600&auto=format&fit=crop',
      seller: 'Ines M.',
      city: 'Monastir',
      condition: 'Bon état'
    },
    {
      id: 7,
      title: 'Vélo de ville',
      category: 'Autres',
      price: 250,
      image: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?q=80&w=600&auto=format&fit=crop',
      seller: 'Karim S.',
      city: 'La Marsa',
      condition: 'Très bon état'
    },
    {
      id: 8,
      title: 'Casque audio Bluetooth',
      category: 'Électronique',
      price: 70,
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=600&auto=format&fit=crop',
      seller: 'Rania Z.',
      city: 'Sfax',
      condition: 'Neuf'
    }
  ];

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
    photoDataUrl: null as string | null
  };

  constructor(
    private toastController: ToastController,
    private translate: TranslateService
  ) {}

  ngOnInit() {
    setTimeout(() => this.loading = false, 900);
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
    this.sellError = '';
    this.sellForm = {
      title: '',
      category: '',
      condition: '',
      price: null,
      negotiable: false,
      city: '',
      description: '',
      photoDataUrl: null
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

    this.sellLoading = true;

    const newProduct: Product = {
      id: Math.max(...this.products.map(p => p.id), 0) + 1,
      title: title.trim(),
      category,
      condition,
      price,
      negotiable: this.sellForm.negotiable,
      city: city.trim(),
      description: this.sellForm.description.trim() || undefined,
      image: this.sellForm.photoDataUrl || NO_PHOTO_PLACEHOLDER,
      seller: 'Vous'
    };

    this.products = [newProduct, ...this.products];
    this.sellLoading = false;
    this.showSellModal = false;

    const toast = await this.toastController.create({
      message: this.translate.instant('MARKETPLACE_PAGE.SELL_SUCCESS'),
      duration: 2500,
      color: 'success',
      position: 'top'
    });
    await toast.present();
  }
}
