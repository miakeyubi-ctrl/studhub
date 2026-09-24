import { Component, OnInit } from '@angular/core';

interface Property {
  id: number;
  title: string;
  city: string;
  price: number;
  image: string;
  category: string;
  rating: number;
}

@Component({
  selector: 'app-tab2',
  templateUrl: './tab2.page.html',
  styleUrls: ['./tab2.page.scss'],
  standalone: false
})
export class Tab2Page implements OnInit {

  loading = true;

  searchText = '';
  selectedCategory = 'Tous';

  categories = ['Tous', 'Studios', 'Colocations', 'Résidences', 'Chambres'];

  properties: Property[] = [
    {
      id: 1,
      title: 'Studio moderne près du campus',
      city: 'Tunis, El Manar',
      price: 450,
      image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=800&auto=format&fit=crop',
      category: 'Studios',
      rating: 4.8
    },
    {
      id: 2,
      title: 'Colocation lumineuse',
      city: 'Sousse, Khezama',
      price: 320,
      image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=80&w=800&auto=format&fit=crop',
      category: 'Colocations',
      rating: 4.5
    },
    {
      id: 3,
      title: 'Résidence universitaire sécurisée',
      city: 'Sfax, Route de l\'Aéroport',
      price: 280,
      image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?q=80&w=800&auto=format&fit=crop',
      category: 'Résidences',
      rating: 4.6
    },
    {
      id: 4,
      title: 'Chambre meublée avec balcon',
      city: 'Ariana, Centre urbain',
      price: 250,
      image: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?q=80&w=800&auto=format&fit=crop',
      category: 'Chambres',
      rating: 4.3
    },
    {
      id: 5,
      title: 'Appartement proche fac de médecine',
      city: 'Monastir',
      price: 400,
      image: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?q=80&w=800&auto=format&fit=crop',
      category: 'Studios',
      rating: 4.7
    },
    {
      id: 6,
      title: 'Colocation étudiante conviviale',
      city: 'La Marsa',
      price: 380,
      image: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?q=80&w=800&auto=format&fit=crop',
      category: 'Colocations',
      rating: 4.4
    }
  ];

  favoriteIds = new Set<number>();

  constructor() {}

  ngOnInit() {
    setTimeout(() => this.loading = false, 900);
  }

  onSearchChange(event: any) {
    this.searchText = event.target.value;
  }

  selectCategory(category: string) {
    this.selectedCategory = category;
  }

  toggleFavorite(id: number, event: Event) {
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

  get filteredProperties(): Property[] {
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
