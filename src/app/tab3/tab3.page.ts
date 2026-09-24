import { Component, OnInit } from '@angular/core';
import { ThemeService } from '../services/theme.service';
import { MessagesService } from '../services/messages.service';
import { LanguageService } from '../services/language.service';
import { AgentAuthService } from '../services/agent-auth.service';

interface Property {
  id: number;
  title: string;
  city: string;
  price: number;
  image: string;
}

interface Reservation {
  id: number;
  title: string;
  city: string;
  image: string;
  dateDebut: string;
  dateFin: string;
  price: number;
  status: 'confirmee' | 'attente' | 'terminee';
}

interface Partner {
  id: number;
  name: string;
  category: string;
  offer: string;
  logo: string;
}

interface MenuItem {
  icon: string;
  label: string;
  route?: string;
  badge?: number;
  danger?: boolean;
}

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
  standalone: false,
})
export class Tab3Page implements OnInit {

  loading = true;

  userName = 'Yassine Ben Salah';
  userEmail = 'yassine.bensalah@studhub.tn';

  stats = [
    { label: 'PROFILE_PAGE.STATS_FAVORITES', value: 3 },
    { label: 'PROFILE_PAGE.STATS_RESERVATIONS', value: 2 },
    { label: 'PROFILE_PAGE.STATS_REVIEWS', value: 5 }
  ];

  favoris: Property[] = [
    {
      id: 1,
      title: 'Studio moderne près du campus',
      city: 'Tunis, El Manar',
      price: 450,
      image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=800&auto=format&fit=crop'
    },
    {
      id: 3,
      title: 'Résidence universitaire sécurisée',
      city: 'Sfax',
      price: 280,
      image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?q=80&w=800&auto=format&fit=crop'
    },
    {
      id: 6,
      title: 'Colocation étudiante conviviale',
      city: 'La Marsa',
      price: 380,
      image: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?q=80&w=800&auto=format&fit=crop'
    }
  ];

  reservations: Reservation[] = [
    {
      id: 1,
      title: 'Studio moderne près du campus',
      city: 'Tunis, El Manar',
      image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=800&auto=format&fit=crop',
      dateDebut: '2026-09-15',
      dateFin: '2027-06-30',
      price: 450,
      status: 'confirmee'
    },
    {
      id: 2,
      title: 'Colocation lumineuse',
      city: 'Sousse, Khezama',
      image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=80&w=800&auto=format&fit=crop',
      dateDebut: '2026-10-01',
      dateFin: '2027-06-30',
      price: 320,
      status: 'attente'
    }
  ];

  partners: Partner[] = [
    {
      id: 1,
      name: 'Talan Tunisie',
      category: 'Entreprise IT',
      offer: 'Stages & offres d\'emploi pour étudiants',
      logo: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?q=80&w=200&auto=format&fit=crop'
    },
    {
      id: 2,
      name: 'Club Entrepreneurs ESPRIT',
      category: 'Association étudiante',
      offer: 'Ateliers et événements networking',
      logo: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=200&auto=format&fit=crop'
    },
    {
      id: 3,
      name: 'InstaDeco',
      category: 'Ameublement',
      offer: '-15% sur le mobilier étudiant',
      logo: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?q=80&w=200&auto=format&fit=crop'
    }
  ];

  menuItems: MenuItem[] = [
    { icon: 'chatbubbles-outline', label: 'PROFILE_PAGE.MENU_MESSAGES', route: '/messages' },
    { icon: 'notifications-outline', label: 'PROFILE_PAGE.MENU_NOTIFICATIONS', badge: 4 },
    { icon: 'person-outline', label: 'PROFILE_PAGE.MENU_EDIT_PROFILE', route: '/edit-profile' },
    { icon: 'flag-outline', label: 'PROFILE_PAGE.MENU_REPORTS' },
    { icon: 'shield-checkmark-outline', label: 'PROFILE_PAGE.MENU_PRIVACY' },
    { icon: 'help-circle-outline', label: 'PROFILE_PAGE.MENU_HELP' },
    { icon: 'log-out-outline', label: 'PROFILE_PAGE.MENU_LOGOUT', danger: true }
  ];

  constructor(
    public theme: ThemeService,
    public language: LanguageService,
    public agentAuth: AgentAuthService,
    private messagesService: MessagesService
  ) {}

  ngOnInit(): void {
    setTimeout(() => this.loading = false, 900);

    const messagerieItem = this.menuItems.find(item => item.route === '/messages');
    const totalUnread = this.messagesService.conversations.reduce((sum, c) => sum + c.unreadCount, 0);

    if (messagerieItem && totalUnread > 0) {
      messagerieItem.badge = totalUnread;
    }
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

  removeFavori(id: number, event: Event) {
    event.stopPropagation();
    this.favoris = this.favoris.filter(p => p.id !== id);
  }

}
