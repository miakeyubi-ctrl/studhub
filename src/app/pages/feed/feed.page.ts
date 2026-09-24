import { Component, OnInit } from '@angular/core';

interface FeedPost {
  id: number;
  authorName: string;
  authorRole: string;
  authorAvatar: string;
  image: string;
  description: string;
  likes: number;
  comments: number;
  liked: boolean;
  expanded: boolean;
  timeAgo: string;
}

@Component({
  selector: 'app-feed',
  templateUrl: './feed.page.html',
  styleUrls: ['./feed.page.scss'],
  standalone: false
})
export class FeedPage implements OnInit {

  loading = true;
  searchTerm = '';

  posts: FeedPost[] = [
    {
      id: 1,
      authorName: 'Youssef Ben Ali',
      authorRole: 'Génie Informatique · ENIT',
      authorAvatar: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?q=80&w=200&auto=format&fit=crop',
      image: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=800&auto=format&fit=crop',
      description: 'Super séance de révision ce soir à la bibliothèque centrale avant les examens ! On était plus de 30 📚👏',
      likes: 214,
      comments: 38,
      liked: false,
      expanded: false,
      timeAgo: 'Il y a 2h'
    },
    {
      id: 2,
      authorName: 'Salma Kacem',
      authorRole: 'Médecine · Fac. de Tunis',
      authorAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop',
      image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=800&auto=format&fit=crop',
      description: 'Groupe de travail pour l\'examen d\'anatomie mis en place, dispo pour toute personne intéressée à nous rejoindre 🙌',
      likes: 156,
      comments: 22,
      liked: false,
      expanded: false,
      timeAgo: 'Il y a 4h'
    },
    {
      id: 3,
      authorName: 'Amine Chargui',
      authorRole: 'Club Robotique · ENSI',
      authorAvatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=200&auto=format&fit=crop',
      image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=800&auto=format&fit=crop',
      description: 'On a remporté le hackathon 48h avec notre projet d\'assistant intelligent pour étudiants. Merci à toute l\'équipe ! 🏆',
      likes: 342,
      comments: 57,
      liked: true,
      expanded: false,
      timeAgo: 'Hier'
    },
    {
      id: 4,
      authorName: 'Nour Abidi',
      authorRole: 'Architecture · ESAU',
      authorAvatar: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?q=80&w=200&auto=format&fit=crop',
      image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=800&auto=format&fit=crop',
      description: 'Petite astuce déco pour aménager sa chambre universitaire sans se ruiner, ça a changé mon quotidien ✨',
      likes: 98,
      comments: 19,
      liked: false,
      expanded: false,
      timeAgo: 'Hier'
    },
    {
      id: 5,
      authorName: 'Khalil Mrad',
      authorRole: 'Association Sportive Universitaire',
      authorAvatar: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?q=80&w=200&auto=format&fit=crop',
      image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=800&auto=format&fit=crop',
      description: 'Résultats du tournoi inter-facultés de basketball ce week-end, bravo à toutes les équipes participantes 🏀',
      likes: 187,
      comments: 15,
      liked: false,
      expanded: false,
      timeAgo: 'Il y a 2 jours'
    },
    {
      id: 6,
      authorName: 'Rania Fersi',
      authorRole: 'Bureau des Étudiants · Sousse',
      authorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop',
      image: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?q=80&w=800&auto=format&fit=crop',
      description: 'Collecte de livres solidaire pour les nouveaux étudiants, déposez vos ouvrages au bureau des étudiants avant vendredi 📖',
      likes: 121,
      comments: 11,
      liked: false,
      expanded: false,
      timeAgo: 'Il y a 3 jours'
    }
  ];

  constructor() {}

  ngOnInit() {
    setTimeout(() => this.loading = false, 800);
  }

  onSearchChange(event: any) {
    this.searchTerm = event.target.value;
  }

  get filteredPosts(): FeedPost[] {
    const term = this.searchTerm.toLowerCase().trim();
    if (!term) return this.posts;

    return this.posts.filter(post =>
      post.authorName.toLowerCase().includes(term) ||
      post.authorRole.toLowerCase().includes(term) ||
      post.description.toLowerCase().includes(term)
    );
  }

  toggleLike(post: FeedPost) {
    post.liked = !post.liked;
    post.likes += post.liked ? 1 : -1;
  }

  toggleExpand(post: FeedPost) {
    post.expanded = !post.expanded;
  }
}
