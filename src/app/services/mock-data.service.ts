import { Injectable } from '@angular/core';

export interface Publisher {
  name: string;
  image: string;
  phone: string;
  memberSince: string;
  verified: boolean;
  rating: number;
  responseTime: string;
}

export interface Property {
  id: number;
  title: string;
  city: string;
  address: string;
  price: number;
  images: string[];
  category: string;
  rating: number;
  reviews: number;
  surface: number;
  rooms: number;
  floor: string;
  furnished: boolean;
  availableFrom: string;
  description: string;
  amenities: string[];
  publisher: Publisher;
}

export interface ProductSpec {
  label: string;
  value: string;
}

export interface Product {
  id: number;
  title: string;
  category: string;
  price: number;
  images: string[];
  condition: string;
  city: string;
  negotiable: boolean;
  description: string;
  specs: ProductSpec[];
  seller: Publisher;
}

export interface ServiceProvider {
  id: number;
  name: string;
  profession: string;
  category: string;
  tier: 'Gratuit' | 'Standard' | 'Premium';
  rating: number;
  reviews: number;
  likes: number;
  comments: number;
  images: string[];
  description: string;
  city: string;
  phone: string;
  experienceYears: number;
  completedMissions: number;
  responseTime: string;
  priceRange: string;
  services: string[];
  memberSince: string;
  verified: boolean;
}

@Injectable({ providedIn: 'root' })
export class MockDataService {

  properties: Property[] = [
    {
      id: 1,
      title: 'Studio moderne près du campus',
      city: 'Tunis, El Manar',
      address: 'Rue des Oliviers, El Manar 1',
      price: 450,
      category: 'Studios',
      rating: 4.8,
      reviews: 24,
      surface: 28,
      rooms: 1,
      floor: '2ème étage',
      furnished: true,
      availableFrom: 'Immédiatement',
      description: 'Studio entièrement rénové à 5 minutes à pied de la faculté des sciences. Cuisine équipée, salle de bain moderne et fibre optique incluse. Idéal pour un étudiant qui cherche calme et confort proche du campus.',
      amenities: ['Wifi fibre', 'Climatisation', 'Cuisine équipée', 'Ascenseur', 'Sécurité 24h/24', 'Machine à laver'],
      images: [
        'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1560185127-6ed189bf02f4?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1556909212-d5b65c56db0a?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=1000&auto=format&fit=crop'
      ],
      publisher: {
        name: 'Karim Jaziri',
        image: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=200&auto=format&fit=crop',
        phone: '22 456 789',
        memberSince: '2022',
        verified: true,
        rating: 4.9,
        responseTime: '~ 30 min'
      }
    },
    {
      id: 2,
      title: 'Colocation lumineuse',
      city: 'Sousse, Khezama',
      address: 'Avenue Khezama Est',
      price: 320,
      category: 'Colocations',
      rating: 4.5,
      reviews: 17,
      surface: 65,
      rooms: 3,
      floor: 'Rez-de-chaussée',
      furnished: true,
      availableFrom: '01 Octobre',
      description: 'Grande maison partagée entre étudiants, ambiance conviviale et sécurisée. Chambre privée avec salon et cuisine communs, jardin partagé. Quartier calme proche des transports.',
      amenities: ['Wifi fibre', 'Jardin', 'Parking', 'Cuisine partagée', 'Buanderie', 'Climatisation'],
      images: [
        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?q=80&w=1000&auto=format&fit=crop'
      ],
      publisher: {
        name: 'Salma Ferchichi',
        image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop',
        phone: '55 321 654',
        memberSince: '2021',
        verified: true,
        rating: 4.6,
        responseTime: '~ 1 h'
      }
    },
    {
      id: 3,
      title: 'Résidence universitaire sécurisée',
      city: 'Sfax, Route de l\'Aéroport',
      address: 'Route de l\'Aéroport, Km 4',
      price: 280,
      category: 'Résidences',
      rating: 4.6,
      reviews: 41,
      surface: 20,
      rooms: 1,
      floor: '3ème étage',
      furnished: true,
      availableFrom: 'Immédiatement',
      description: 'Chambre en résidence universitaire privée avec surveillance 24h/24, salle d\'étude commune et cafétéria sur place. Idéal pour les étudiants qui cherchent tranquillité et sécurité.',
      amenities: ['Sécurité 24h/24', 'Salle d\'étude', 'Cafétéria', 'Wifi fibre', 'Buanderie', 'Salle de sport'],
      images: [
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1586105251261-72a756497a11?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1571508601891-ca5e7a713859?q=80&w=1000&auto=format&fit=crop'
      ],
      publisher: {
        name: 'Youssef Amri',
        image: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?q=80&w=200&auto=format&fit=crop',
        phone: '98 765 432',
        memberSince: '2020',
        verified: true,
        rating: 4.7,
        responseTime: '~ 2 h'
      }
    },
    {
      id: 4,
      title: 'Chambre meublée avec balcon',
      city: 'Ariana, Centre urbain',
      address: 'Rue Habib Bourguiba, Centre Urbain Nord',
      price: 250,
      category: 'Chambres',
      rating: 4.3,
      reviews: 12,
      surface: 16,
      rooms: 1,
      floor: '1er étage',
      furnished: true,
      availableFrom: '15 Septembre',
      description: 'Chambre indépendante avec balcon privé et bonne luminosité, dans un appartement partagé avec une seule autre étudiante. Quartier calme, proche des commerces et des lignes de bus.',
      amenities: ['Balcon privé', 'Wifi fibre', 'Cuisine partagée', 'Climatisation', 'Proche transports'],
      images: [
        'https://images.unsplash.com/photo-1505691938895-1758d7feb511?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1502672023488-70e25813eb80?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1560184897-ae75f418493e?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1560448205-4d9b3e6bb6db?q=80&w=1000&auto=format&fit=crop'
      ],
      publisher: {
        name: 'Rania Belhadj',
        image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=200&auto=format&fit=crop',
        phone: '27 112 233',
        memberSince: '2023',
        verified: false,
        rating: 4.4,
        responseTime: '~ 45 min'
      }
    },
    {
      id: 5,
      title: 'Appartement proche fac de médecine',
      city: 'Monastir',
      address: 'Avenue de l\'Environnement',
      price: 400,
      category: 'Studios',
      rating: 4.7,
      reviews: 19,
      surface: 32,
      rooms: 1,
      floor: '4ème étage',
      furnished: true,
      availableFrom: 'Immédiatement',
      description: 'Bel appartement indépendant à deux pas de la faculté de médecine, entièrement équipé et lumineux. Vue dégagée, immeuble calme avec ascenseur et parking sécurisé.',
      amenities: ['Ascenseur', 'Parking sécurisé', 'Wifi fibre', 'Cuisine équipée', 'Climatisation'],
      images: [
        'https://images.unsplash.com/photo-1493809842364-78817add7ffb?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1567767292278-a4f21aa2d36e?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1556020685-ae41abfc9365?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?q=80&w=1000&auto=format&fit=crop'
      ],
      publisher: {
        name: 'Mehdi Souissi',
        image: 'https://images.unsplash.com/photo-1531891437562-4301cf35b7e4?q=80&w=200&auto=format&fit=crop',
        phone: '24 998 877',
        memberSince: '2022',
        verified: true,
        rating: 4.8,
        responseTime: '~ 20 min'
      }
    },
    {
      id: 6,
      title: 'Colocation étudiante conviviale',
      city: 'La Marsa',
      address: 'Rue Taïeb Mhiri, La Marsa',
      price: 380,
      category: 'Colocations',
      rating: 4.4,
      reviews: 15,
      surface: 58,
      rooms: 2,
      floor: 'Rez-de-chaussée',
      furnished: true,
      availableFrom: '01 Octobre',
      description: 'Colocation entre 3 étudiants dans une villa proche de la plage. Chambre spacieuse, ambiance chaleureuse, jardin et terrasse partagés. Quartier animé et sécurisé.',
      amenities: ['Jardin', 'Terrasse', 'Wifi fibre', 'Parking', 'Proche plage', 'Cuisine équipée'],
      images: [
        'https://images.unsplash.com/photo-1484154218962-a197022b5858?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1523217582562-09d0def993a6?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1560185008-b033106af5c3?q=80&w=1000&auto=format&fit=crop'
      ],
      publisher: {
        name: 'Nadia Cherif',
        image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop',
        phone: '50 665 544',
        memberSince: '2021',
        verified: true,
        rating: 4.5,
        responseTime: '~ 1 h'
      }
    }
  ];

  products: Product[] = [
    {
      id: 1,
      title: 'iPhone 12 - 128 Go',
      category: 'Électronique',
      price: 950,
      condition: 'Très bon état',
      city: 'Tunis',
      negotiable: true,
      description: 'iPhone 12 128 Go coloris noir, acheté il y a un an, toujours sous protection d\'écran. Batterie à 89%, aucune rayure, vendu avec chargeur et boîte d\'origine.',
      specs: [
        { label: 'Marque', value: 'Apple' },
        { label: 'Stockage', value: '128 Go' },
        { label: 'Batterie', value: '89%' },
        { label: 'Accessoires', value: 'Chargeur + boîte' }
      ],
      images: [
        'https://images.unsplash.com/photo-1592286927505-1def25115558?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1616348436168-de43ad0db179?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1565849904461-04a58ad377e0?q=80&w=1000&auto=format&fit=crop'
      ],
      seller: {
        name: 'Amine Khelifi',
        image: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?q=80&w=200&auto=format&fit=crop',
        phone: '92 345 678',
        memberSince: '2023',
        verified: true,
        rating: 4.8,
        responseTime: '~ 15 min'
      }
    },
    {
      id: 2,
      title: 'Ordinateur portable Dell',
      category: 'Électronique',
      price: 1200,
      condition: 'Bon état',
      city: 'Sfax',
      negotiable: true,
      description: 'Dell Inspiron 15", Intel Core i5, 8 Go RAM, 256 Go SSD. Parfait pour les études, quelques traces d\'usure sur le capot mais fonctionne parfaitement.',
      specs: [
        { label: 'Processeur', value: 'Intel Core i5' },
        { label: 'RAM', value: '8 Go' },
        { label: 'Stockage', value: 'SSD 256 Go' },
        { label: 'Écran', value: '15.6"' }
      ],
      images: [
        'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1524678606370-a47ad25cb82a?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?q=80&w=1000&auto=format&fit=crop'
      ],
      seller: {
        name: 'Salma Trabelsi',
        image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop',
        phone: '58 234 567',
        memberSince: '2022',
        verified: true,
        rating: 4.6,
        responseTime: '~ 40 min'
      }
    },
    {
      id: 3,
      title: 'Bureau + chaise étudiant',
      category: 'Meubles',
      price: 180,
      condition: 'Bon état',
      city: 'Sousse',
      negotiable: true,
      description: 'Ensemble bureau et chaise ergonomique, idéal pour étudier confortablement. Bois massif, tiroir de rangement inclus. À récupérer sur place.',
      specs: [
        { label: 'Matériau', value: 'Bois massif' },
        { label: 'Dimensions', value: '120 x 60 cm' },
        { label: 'Rangement', value: '1 tiroir' },
        { label: 'Livraison', value: 'À convenir' }
      ],
      images: [
        'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1505843513577-22bb7d21e455?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1595428774223-ef52624120d2?q=80&w=1000&auto=format&fit=crop'
      ],
      seller: {
        name: 'Mohamed Ayari',
        image: 'https://images.unsplash.com/photo-1531891437562-4301cf35b7e4?q=80&w=200&auto=format&fit=crop',
        phone: '27 890 123',
        memberSince: '2021',
        verified: false,
        rating: 4.3,
        responseTime: '~ 1 h'
      }
    },
    {
      id: 4,
      title: 'Veste d\'hiver taille M',
      category: 'Vêtements',
      price: 45,
      condition: 'Neuf',
      city: 'Ariana',
      negotiable: false,
      description: 'Veste d\'hiver imperméable, taille M, jamais portée (étiquette encore présente). Couleur bleu marine, doublure chaude, idéale pour l\'hiver tunisien.',
      specs: [
        { label: 'Taille', value: 'M' },
        { label: 'Couleur', value: 'Bleu marine' },
        { label: 'État', value: 'Neuf avec étiquette' },
        { label: 'Matière', value: 'Imperméable' }
      ],
      images: [
        'https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1544022613-e87ca75a784a?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1520975916090-3105956dac38?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1520975954732-35dd22299614?q=80&w=1000&auto=format&fit=crop'
      ],
      seller: {
        name: 'Nour Hammami',
        image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=200&auto=format&fit=crop',
        phone: '20 456 789',
        memberSince: '2023',
        verified: true,
        rating: 4.9,
        responseTime: '~ 10 min'
      }
    },
    {
      id: 5,
      title: 'Lot de livres - Génie Informatique',
      category: 'Livres',
      price: 60,
      condition: 'Bon état',
      city: 'Tunis, El Manar',
      negotiable: true,
      description: 'Lot de 8 livres de référence en génie informatique (algorithmique, réseaux, bases de données). Très utiles pour les étudiants en licence et master, quelques annotations au crayon.',
      specs: [
        { label: 'Nombre', value: '8 livres' },
        { label: 'Domaine', value: 'Génie informatique' },
        { label: 'Langue', value: 'Français / Anglais' },
        { label: 'État', value: 'Bon état, annoté' }
      ],
      images: [
        'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1519682337058-a94d519337bc?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?q=80&w=1000&auto=format&fit=crop'
      ],
      seller: {
        name: 'Yassine Bouzid',
        image: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?q=80&w=200&auto=format&fit=crop',
        phone: '55 678 901',
        memberSince: '2022',
        verified: false,
        rating: 4.5,
        responseTime: '~ 2 h'
      }
    },
    {
      id: 6,
      title: 'Étagère de rangement',
      category: 'Meubles',
      price: 90,
      condition: 'Bon état',
      city: 'Monastir',
      negotiable: true,
      description: 'Étagère de rangement 5 niveaux, parfaite pour organiser vêtements et affaires dans une petite chambre. Facile à démonter pour le transport.',
      specs: [
        { label: 'Niveaux', value: '5' },
        { label: 'Matériau', value: 'Bois / Métal' },
        { label: 'Dimensions', value: '180 x 80 x 40 cm' },
        { label: 'Démontable', value: 'Oui' }
      ],
      images: [
        'https://images.unsplash.com/photo-1594620302200-9a762244a156?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1517705008128-361805f42e86?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1595428774223-ef52624120d2?q=80&w=1000&auto=format&fit=crop'
      ],
      seller: {
        name: 'Ines Mejri',
        image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop',
        phone: '24 123 789',
        memberSince: '2021',
        verified: true,
        rating: 4.4,
        responseTime: '~ 30 min'
      }
    },
    {
      id: 7,
      title: 'Vélo de ville',
      category: 'Autres',
      price: 250,
      condition: 'Très bon état',
      city: 'La Marsa',
      negotiable: true,
      description: 'Vélo de ville confortable, parfait pour se déplacer sur le campus et en ville. Pneus neufs, freins récemment révisés, avec panier avant.',
      specs: [
        { label: 'Type', value: 'Vélo de ville' },
        { label: 'Taille', value: 'Adulte unique' },
        { label: 'Pneus', value: 'Neufs' },
        { label: 'Accessoires', value: 'Panier avant' }
      ],
      images: [
        'https://images.unsplash.com/photo-1485965120184-e220f721d03e?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1517649763962-0c623066013b?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1502744688674-c619d1586c9e?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1571068316344-75bc76f77890?q=80&w=1000&auto=format&fit=crop'
      ],
      seller: {
        name: 'Karim Sassi',
        image: 'https://images.unsplash.com/photo-1531891437562-4301cf35b7e4?q=80&w=200&auto=format&fit=crop',
        phone: '98 234 567',
        memberSince: '2020',
        verified: true,
        rating: 4.7,
        responseTime: '~ 25 min'
      }
    },
    {
      id: 8,
      title: 'Casque audio Bluetooth',
      category: 'Électronique',
      price: 70,
      condition: 'Neuf',
      city: 'Sfax',
      negotiable: false,
      description: 'Casque audio Bluetooth sans fil, autonomie 20h, réduction de bruit active. Jamais utilisé, encore dans son emballage d\'origine.',
      specs: [
        { label: 'Connectivité', value: 'Bluetooth 5.0' },
        { label: 'Autonomie', value: '20 heures' },
        { label: 'Réduction de bruit', value: 'Active' },
        { label: 'État', value: 'Neuf, emballé' }
      ],
      images: [
        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1484704849700-f032a568e944?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1583394838336-acd977736f90?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1546435770-a3e426bf472b?q=80&w=1000&auto=format&fit=crop'
      ],
      seller: {
        name: 'Rania Zouari',
        image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=200&auto=format&fit=crop',
        phone: '50 987 654',
        memberSince: '2023',
        verified: true,
        rating: 4.8,
        responseTime: '~ 15 min'
      }
    }
  ];

  prestataires: ServiceProvider[] = [
    {
      id: 1,
      name: 'Ahmed Sassi',
      profession: 'Développeur mobile',
      category: 'Développement',
      tier: 'Premium',
      rating: 4.9,
      reviews: 38,
      likes: 128,
      comments: 24,
      city: 'Tunis',
      phone: '22 334 455',
      experienceYears: 5,
      completedMissions: 62,
      responseTime: '~ 20 min',
      priceRange: 'À partir de 150 DT',
      memberSince: '2020',
      verified: true,
      description: 'Développement d\'applications Android & iOS pour étudiants et startups. Spécialisé en Flutter et React Native, du prototype au déploiement sur les stores.',
      services: ['Applications Android', 'Applications iOS', 'Refonte d\'apps existantes', 'Maintenance & support'],
      images: [
        'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=1000&auto=format&fit=crop'
      ]
    },
    {
      id: 2,
      name: 'Mariem Chaabane',
      profession: 'Graphiste',
      category: 'Design',
      tier: 'Standard',
      rating: 4.7,
      reviews: 25,
      likes: 94,
      comments: 17,
      city: 'Sousse',
      phone: '55 667 788',
      experienceYears: 3,
      completedMissions: 47,
      responseTime: '~ 1 h',
      priceRange: 'À partir de 60 DT',
      memberSince: '2022',
      verified: true,
      description: 'Logos, affiches et identité visuelle pour projets étudiants et petites entreprises. Livraison rapide de fichiers sources et déclinaisons pour réseaux sociaux.',
      services: ['Création de logo', 'Affiches & flyers', 'Identité visuelle', 'Contenus réseaux sociaux'],
      images: [
        'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1626785774573-4b799315345d?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1561070791-2526d30994b5?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1558655146-d09347e92766?q=80&w=1000&auto=format&fit=crop'
      ]
    },
    {
      id: 3,
      name: 'Firas Bouazizi',
      profession: 'Photographe',
      category: 'Photographie',
      tier: 'Gratuit',
      rating: 4.5,
      reviews: 14,
      likes: 61,
      comments: 9,
      city: 'Sfax',
      phone: '27 998 811',
      experienceYears: 2,
      completedMissions: 21,
      responseTime: '~ 2 h',
      priceRange: 'À partir de 50 DT',
      memberSince: '2023',
      verified: false,
      description: 'Shooting photo pour événements étudiants, portraits et projets de fin d\'études. Matériel professionnel et retouche incluse.',
      services: ['Shooting portrait', 'Couverture d\'événements', 'Photos de projets', 'Retouche photo'],
      images: [
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1471341971476-ae15ff5dd4ea?q=80&w=1000&auto=format&fit=crop'
      ]
    },
    {
      id: 4,
      name: 'Ines Gharbi',
      profession: 'Formatrice en langues',
      category: 'Formation',
      tier: 'Standard',
      rating: 4.8,
      reviews: 33,
      likes: 143,
      comments: 31,
      city: 'Ariana',
      phone: '24 556 677',
      experienceYears: 6,
      completedMissions: 89,
      responseTime: '~ 40 min',
      priceRange: 'À partir de 40 DT/h',
      memberSince: '2019',
      verified: true,
      description: 'Cours particuliers d\'anglais et de français pour étudiants, préparation aux examens et certifications (TOEFL, DELF). Cours en ligne ou en présentiel.',
      services: ['Cours d\'anglais', 'Cours de français', 'Préparation TOEFL / DELF', 'Cours en ligne'],
      images: [
        'https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1000&auto=format&fit=crop'
      ]
    },
    {
      id: 5,
      name: 'Walid Trabelsi',
      profession: 'Réparateur informatique',
      category: 'Réparation',
      tier: 'Premium',
      rating: 4.6,
      reviews: 29,
      likes: 77,
      comments: 12,
      city: 'Monastir',
      phone: '98 112 233',
      experienceYears: 8,
      completedMissions: 104,
      responseTime: '~ 15 min',
      priceRange: 'À partir de 30 DT',
      memberSince: '2018',
      verified: true,
      description: 'Réparation d\'ordinateurs et de téléphones, dépannage rapide à domicile ou en atelier. Diagnostic gratuit et pièces garanties.',
      services: ['Réparation PC & Mac', 'Réparation smartphones', 'Récupération de données', 'Dépannage à domicile'],
      images: [
        'https://images.unsplash.com/photo-1531891437562-4301cf35b7e4?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1518773553398-650c184e0bb3?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1550009158-9ebf69173e03?q=80&w=1000&auto=format&fit=crop'
      ]
    }
  ];

  getPropertyById(id: number): Property | undefined {
    return this.properties.find(p => p.id === id);
  }

  getProductById(id: number): Product | undefined {
    return this.products.find(p => p.id === id);
  }

  getPrestataireById(id: number): ServiceProvider | undefined {
    return this.prestataires.find(p => p.id === id);
  }

  tierClass(tier: ServiceProvider['tier']): string {
    switch (tier) {
      case 'Premium': return 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400';
      case 'Standard': return 'bg-primary-50 dark:bg-primary-700/40 text-primary-700 dark:text-primary-200';
      case 'Gratuit': return 'bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-300';
    }
  }

  telLink(phone: string): string {
    return 'tel:+216' + phone.replace(/\s/g, '');
  }

  whatsappLink(phone: string): string {
    return 'https://wa.me/216' + phone.replace(/\s/g, '');
  }
}
