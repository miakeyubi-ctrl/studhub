import { Injectable } from '@angular/core';

export interface ChatMessage {
  id: number;
  text: string;
  time: string;
  fromMe: boolean;
}

export interface Conversation {
  id: number;
  name: string;
  role: string;
  avatar: string;
  online: boolean;
  lastMessageTime: string;
  unreadCount: number;
  messages: ChatMessage[];
}

@Injectable({ providedIn: 'root' })
export class MessagesService {

  conversations: Conversation[] = [
    {
      id: 1,
      name: 'Karim Jaziri',
      role: 'Propriétaire · Studio moderne près du campus',
      avatar: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=200&auto=format&fit=crop',
      online: true,
      lastMessageTime: '10:24',
      unreadCount: 2,
      messages: [
        { id: 1, text: 'Bonjour, le studio à El Manar est-il toujours disponible ?', time: '09:58', fromMe: true },
        { id: 2, text: 'Bonjour ! Oui il est toujours disponible.', time: '10:02', fromMe: false },
        { id: 3, text: 'Super, je peux venir visiter ce week-end ?', time: '10:10', fromMe: true },
        { id: 4, text: 'Avec plaisir, samedi 14h ça vous va ?', time: '10:20', fromMe: false },
        { id: 5, text: 'Le studio est toujours disponible, vous pouvez visiter samedi.', time: '10:24', fromMe: false }
      ]
    },
    {
      id: 2,
      name: 'Salma Ferchichi',
      role: 'Propriétaire · Colocation lumineuse',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop',
      online: false,
      lastMessageTime: 'Hier',
      unreadCount: 0,
      messages: [
        { id: 1, text: 'Bonjour, je suis intéressée par la colocation à Sousse.', time: 'Hier 16:40', fromMe: true },
        { id: 2, text: 'Bonjour, avec plaisir ! Vous êtes combien ?', time: 'Hier 17:02', fromMe: false },
        { id: 3, text: 'Je cherche juste une chambre pour moi.', time: 'Hier 17:05', fromMe: true },
        { id: 4, text: "D'accord, je vous envoie le contrat demain.", time: 'Hier 17:10', fromMe: false }
      ]
    },
    {
      id: 3,
      name: 'Ahmed Sassi',
      role: 'Développeur mobile · STUD Services',
      avatar: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?q=80&w=200&auto=format&fit=crop',
      online: true,
      lastMessageTime: '09:47',
      unreadCount: 1,
      messages: [
        { id: 1, text: "Bonjour, j'aurais besoin d'une app pour mon projet de fin d'études.", time: '09:15', fromMe: true },
        { id: 2, text: "Bonjour ! Bien sûr, dites-m'en plus sur le projet.", time: '09:20', fromMe: false },
        { id: 3, text: 'Une app de gestion de bibliothèque, avec login et recherche.', time: '09:30', fromMe: true },
        { id: 4, text: 'Le devis pour l\'application est prêt, je vous l\'envoie.', time: '09:47', fromMe: false }
      ]
    },
    {
      id: 4,
      name: 'Ines Gharbi',
      role: 'Formatrice en langues · STUD Services',
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=200&auto=format&fit=crop',
      online: false,
      lastMessageTime: 'Lun',
      unreadCount: 0,
      messages: [
        { id: 1, text: "Bonjour, je voudrais des cours d'anglais pour préparer le TOEFL.", time: 'Lun 11:00', fromMe: true },
        { id: 2, text: 'Bonjour, très bien ! On peut commencer par un test de niveau.', time: 'Lun 11:20', fromMe: false },
        { id: 3, text: 'Jeudi 18h ça vous convient ?', time: 'Lun 11:25', fromMe: true },
        { id: 4, text: 'Parfait, à jeudi 18h pour le cours d\'anglais !', time: 'Lun 11:30', fromMe: false }
      ]
    },
    {
      id: 5,
      name: 'Walid Trabelsi',
      role: 'Réparateur informatique · STUD Services',
      avatar: 'https://images.unsplash.com/photo-1531891437562-4301cf35b7e4?q=80&w=200&auto=format&fit=crop',
      online: false,
      lastMessageTime: 'Sam',
      unreadCount: 0,
      messages: [
        { id: 1, text: 'Bonjour, mon ordinateur ne démarre plus du tout.', time: 'Sam 09:00', fromMe: true },
        { id: 2, text: 'Bonjour, apportez-le moi je regarde ça aujourd\'hui.', time: 'Sam 09:10', fromMe: false },
        { id: 3, text: 'Votre ordinateur est prêt, vous pouvez passer le récupérer.', time: 'Sam 15:40', fromMe: false }
      ]
    },
    {
      id: 6,
      name: 'Nadia Cherif',
      role: 'Marketplace · Lot de livres - Génie Informatique',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop',
      online: true,
      lastMessageTime: '08:12',
      unreadCount: 3,
      messages: [
        { id: 1, text: 'Bonjour, le lot de livres est-il toujours en vente ?', time: '07:50', fromMe: true },
        { id: 2, text: 'Oui toujours dispo !', time: '07:55', fromMe: false },
        { id: 3, text: 'Vous feriez un prix si je prends tout le lot ?', time: '08:05', fromMe: true },
        { id: 4, text: 'Je peux baisser à 50 DT si vous prenez tout le lot.', time: '08:12', fromMe: false }
      ]
    }
  ];

  getConversation(id: number): Conversation | undefined {
    return this.conversations.find(c => c.id === id);
  }

  startConversation(person: { name: string; avatar: string; role: string }): number {
    const existing = this.conversations.find(c => c.name === person.name && c.role === person.role);

    if (existing) {
      return existing.id;
    }

    const conversation: Conversation = {
      id: Math.max(...this.conversations.map(c => c.id), 0) + 1,
      name: person.name,
      role: person.role,
      avatar: person.avatar,
      online: false,
      lastMessageTime: '',
      unreadCount: 0,
      messages: []
    };

    this.conversations = [conversation, ...this.conversations];

    return conversation.id;
  }

  sendMessage(conversationId: number, text: string): ChatMessage | undefined {
    const conversation = this.getConversation(conversationId);
    if (!conversation) return undefined;

    const message: ChatMessage = {
      id: conversation.messages.length + 1,
      text,
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      fromMe: true
    };

    conversation.messages.push(message);
    conversation.lastMessageTime = message.time;
    conversation.unreadCount = 0;

    return message;
  }
}
