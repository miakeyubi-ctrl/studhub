import { Component, OnInit } from '@angular/core';
import Splide from '@splidejs/splide';
import { ThemeService } from '../services/theme.service';
import { MessagesService } from '../services/messages.service';

interface Property {
  id: number;
  title: string;
  city: string;
  price: number;
  image: string;
  category: string;
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
export class Tab1Page implements OnInit {

  constructor(public theme: ThemeService, private messagesService: MessagesService) {}

  get unreadMessages(): number {
    return this.messagesService.conversations.reduce((sum, c) => sum + c.unreadCount, 0);
  }

  loading = true;

  userName = 'Yassine Ben Salah';

  categories = ['Tous', 'Studios', 'Colocations', 'Résidences', 'Chambres'];
  selectedCategory = 'Tous';

  featured: Property[] = [
    {
      id: 1,
      title: 'Studio moderne près du campus',
      city: 'Tunis, El Manar',
      price: 450,
      image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=800&auto=format&fit=crop',
      category: 'Studios'
    },
    {
      id: 2,
      title: 'Colocation lumineuse',
      city: 'Sousse, Khezama',
      price: 320,
      image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=80&w=800&auto=format&fit=crop',
      category: 'Colocations'
    },
    {
      id: 3,
      title: 'Résidence universitaire sécurisée',
      city: 'Sfax, Route de l\'Aéroport',
      price: 280,
      image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?q=80&w=800&auto=format&fit=crop',
      category: 'Résidences'
    }
  ];

  recentlyViewed: Property[] = [
    {
      id: 4,
      title: 'Chambre meublée',
      city: 'Ariana',
      price: 250,
      image: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?q=80&w=800&auto=format&fit=crop',
      category: 'Chambres'
    },
    {
      id: 5,
      title: 'Appartement proche fac',
      city: 'Monastir',
      price: 400,
      image: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?q=80&w=800&auto=format&fit=crop',
      category: 'Studios'
    }
  ];

  products: Product[] = [
    {
      id: 1,
      title: 'iPhone 12 - 128 Go',
      price: 950,
      image: 'https://images.unsplash.com/photo-1592286927505-1def25115558?q=80&w=600&auto=format&fit=crop',
      category: 'Électronique',
      condition: 'Très bon état'
    },
    {
      id: 5,
      title: 'Lot de livres - Génie Informatique',
      price: 60,
      image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=600&auto=format&fit=crop',
      category: 'Livres',
      condition: 'Bon état'
    },
    {
      id: 3,
      title: 'Bureau + chaise étudiant',
      price: 180,
      image: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?q=80&w=600&auto=format&fit=crop',
      category: 'Meubles',
      condition: 'Bon état'
    }
  ];

  prestataires: Prestataire[] = [
    {
      id: 1,
      name: 'Ahmed Sassi',
      profession: 'Développeur mobile',
      tier: 'Premium',
      rating: 4.9,
      image: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?q=80&w=300&auto=format&fit=crop'
    },
    {
      id: 2,
      name: 'Mariem Chaabane',
      profession: 'Graphiste',
      tier: 'Standard',
      rating: 4.7,
      image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=300&auto=format&fit=crop'
    },
    {
      id: 4,
      name: 'Ines Gharbi',
      profession: 'Formatrice en langues',
      tier: 'Standard',
      rating: 4.8,
      image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=300&auto=format&fit=crop'
    }
  ];

  tierClass(tier: Prestataire['tier']): string {
    switch (tier) {
      case 'Premium': return 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400';
      case 'Standard': return 'bg-primary-50 dark:bg-primary-700/40 text-primary-700 dark:text-primary-200';
      case 'Gratuit': return 'bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-300';
    }
  }

  favoriteIds = new Set<number>();

  toggleFavorite(id: number, event: Event): void {
    event.stopPropagation();
    event.preventDefault();

    if (this.favoriteIds.has(id)) {
      this.favoriteIds.delete(id);
    } else {
      this.favoriteIds.add(id);
    }
  }

  isFavorite(id: number): boolean {
    return this.favoriteIds.has(id);
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
    setTimeout(() => this.mountPromoCarousel(), 0);

    setTimeout(() => {
      this.loading = false;
      setTimeout(() => this.mountCarousel(), 0);
    }, 900);
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
