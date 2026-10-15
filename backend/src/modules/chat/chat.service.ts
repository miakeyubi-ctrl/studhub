import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PushService } from '../push/push.service';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
  ) {}

  async listConversationsFor(subject: { type: 'user' | 'agent'; id: number }) {
    const where: any = subject.type === 'user'
      ? { OR: [{ studentId: subject.id }, { peerStudentId: subject.id }] }
      : { agentId: subject.id };
    return this.prisma.conversation.findMany({
      where,
      orderBy: { lastMessageAt: 'desc' },
      include: {
        student: { select: { id:true, fullName:true, avatarUrl:true, phone:true } },
        peerStudent: { select: { id:true, fullName:true, avatarUrl:true, phone:true } },
        agent:   { select: { id:true, agencyName:true, avatarUrl:true, phone:true } },
      },
    });
  }

  async getOrCreateConversation(subject: { type: 'user' | 'agent'; id: number }, other: { type: 'user' | 'agent'; id: number }) {
    // Étudiant ↔ Agent
    if (subject.type !== other.type) {
      const [studentId, agentId] = subject.type === 'user'
        ? [subject.id, other.id]
        : [other.id, subject.id];
      let conv = await this.prisma.conversation.findUnique({
        where: { studentId_agentId: { studentId, agentId } },
      });
      if (!conv) {
        conv = await this.prisma.conversation.create({
          data: { studentId, agentId, lastMessageAt: new Date() },
        });
      }
      return conv;
    }

    // Étudiant ↔ Étudiant (marketplace / feed)
    if (subject.type === 'user' && other.type === 'user') {
      if (subject.id === other.id) {
        throw new ForbiddenException('Impossible de vous contacter vous-même');
      }
      const [studentId, peerStudentId] = subject.id < other.id
        ? [subject.id, other.id]
        : [other.id, subject.id];
      let conv = await this.prisma.conversation.findUnique({
        where: { studentId_peerStudentId: { studentId, peerStudentId } },
      });
      if (!conv) {
        conv = await this.prisma.conversation.create({
          data: { studentId, peerStudentId, agentId: null, lastMessageAt: new Date() },
        });
      }
      return conv;
    }

    throw new ForbiddenException('Type de conversation non supporté');
  }

  async getConversationMembers(conversationId: number) {
    const conv = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { id: true, studentId: true, peerStudentId: true, agentId: true },
    });
    if (!conv) throw new NotFoundException('Conversation introuvable');
    return conv;
  }

  async getMessages(conversationId: number, limit = 50, beforeId?: number) {
    const where: any = { conversationId };
    if (beforeId) where.id = { lt: Number(beforeId) };
    return this.prisma.chatMessage.findMany({
      where, take: limit, orderBy: { createdAt: 'desc' },
      include: {
        studentSender: { select: { id:true, fullName:true, avatarUrl:true } },
        agentSender:   { select: { id:true, agencyName:true, avatarUrl:true } },
      },
    });
  }

  async saveMessage(conversationId: number, sender: { type: 'user' | 'agent'; id: number }, content: string, mediaUrl?: string) {
    const conv = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conv) throw new NotFoundException('Conversation introuvable');
    if (conv.allowReplies === false || conv.type === 'SYSTEM') {
      throw new ForbiddenException('Cette conversation ne permet pas de répondre');
    }
    const isStudent = sender.type === 'user';
    const isMember = isStudent
      ? (conv.studentId === sender.id || conv.peerStudentId === sender.id)
      : (conv.agentId === sender.id);
    if (!isMember) {
      throw new ForbiddenException("Pas membre de cette conversation");
    }

    const data: any = {
      conversationId,
      content: content || '',
      mediaUrl,
    };
    if (isStudent) data.studentSenderId = sender.id;
    else           data.agentSenderId   = sender.id;

    const msg = await this.prisma.chatMessage.create({
      data,
      include: {
        studentSender: { select: { id:true, fullName:true, avatarUrl:true } },
        agentSender:   { select: { id:true, agencyName:true, avatarUrl:true } },
      },
    });

    // unreadStudentCount = côté studentId ; unreadAgentCount = côté agent OU peerStudent
    const update: any = {
      lastMessage: this.previewForLastMessage(msg.content, msg.mediaUrl),
      lastMessageAt: msg.createdAt,
    };
    if (conv.peerStudentId) {
      // conv étudiant↔étudiant
      if (sender.id === conv.studentId) {
        update.unreadStudentCount = { set: 0 };
        update.unreadAgentCount = { increment: 1 }; // peer unread
      } else {
        update.unreadAgentCount = { set: 0 };
        update.unreadStudentCount = { increment: 1 };
      }
    } else if (isStudent) {
      update.unreadStudentCount = { set: 0 };
      update.unreadAgentCount = { increment: 1 };
    } else {
      update.unreadAgentCount = { set: 0 };
      update.unreadStudentCount = { increment: 1 };
    }

    await this.prisma.conversation.update({ where: { id: conversationId }, data: update });

    if (!String(msg.content || '').startsWith('__CALL__:')) {
      void this.notifyRecipientPush(conv, sender, msg).catch(() => {});
    }

    return msg;
  }

  /**
   * Message de bienvenue système (non répondable) — idempotent.
   */
  async ensureStudhubWelcome(studentId: number, firstName?: string) {
    const existing = await this.prisma.conversation.findFirst({
      where: { studentId, type: 'SYSTEM' },
      include: {
        student: { select: { id: true, fullName: true, avatarUrl: true, phone: true } },
        agent: { select: { id: true, agencyName: true, avatarUrl: true, phone: true } },
        messages: { orderBy: { createdAt: 'asc' }, take: 5 },
      },
    });
    if (existing) {
      return { conversation: existing, created: false };
    }

    const name =
      (firstName && firstName.trim()) ||
      (await this.prisma.user.findUnique({ where: { id: studentId }, select: { fullName: true } }))
        ?.fullName?.split(/\s+/)[0] ||
      'là';

    const text =
      `Salut ${name} 👋 Bienvenue sur StudHub !\n\n` +
      `On est ravis de t’accueillir. Explore les annonces, le marketplace et les services étudiants — ` +
      `et n’hésite pas à compléter ton profil.\n\n` +
      `— L’équipe StudHub`;

    const conv = await this.prisma.conversation.create({
      data: {
        type: 'SYSTEM',
        title: 'Équipe StudHub',
        studentId,
        agentId: null,
        allowReplies: false,
        lastMessage: text.slice(0, 180),
        lastMessageAt: new Date(),
        unreadStudentCount: 1,
        unreadAgentCount: 0,
        messages: {
          create: {
            content: text,
            isSystem: true,
          },
        },
      },
      include: {
        student: { select: { id: true, fullName: true, avatarUrl: true, phone: true } },
        agent: { select: { id: true, agencyName: true, avatarUrl: true, phone: true } },
        messages: { orderBy: { createdAt: 'asc' }, take: 5 },
      },
    });

    void this.push.notifyChatMessage({
      recipient: { type: 'user', id: studentId },
      conversationId: conv.id,
      title: 'Équipe StudHub',
      body: text.slice(0, 160),
    }).catch(() => {});

    return { conversation: conv, created: true };
  }

  private previewForLastMessage(content: string, mediaUrl?: string | null): string {
    const raw = String(content || '');
    if (raw.startsWith('__CALL__:')) {
      const parts = raw.split(':');
      const status = parts[1];
      const dur = Math.max(0, Number(parts[2] || 0) || 0);
      const dir = parts[3] === 'in' ? 'in' : 'out';
      const mm = String(Math.floor(dur / 60)).padStart(2, '0');
      const ss = String(dur % 60).padStart(2, '0');
      const side = dir === 'out' ? 'sortant' : 'entrant';
      switch (status) {
        case 'completed':
          return `Appel ${side} · ${mm}:${ss}`;
        case 'missed':
          return dir === 'out' ? 'Appel sortant manqué' : 'Appel entrant manqué';
        case 'rejected':
          return dir === 'out' ? 'Appel sortant refusé' : 'Appel entrant refusé';
        case 'cancelled':
          return dir === 'out' ? 'Appel sortant annulé' : 'Appel entrant annulé';
        default:
          return `Appel ${side}`;
      }
    }
    if (mediaUrl) {
      const kind = this.mediaKindFromUrl(mediaUrl);
      if (kind === 'audio') return '🎤 Note vocale';
      if (kind === 'image') return raw || '📷 Photo';
      return raw ? `📎 ${raw}` : '📎 Fichier';
    }
    return raw || '[piece-jointe]';
  }

  private mediaKindFromUrl(url: string): 'image' | 'audio' | 'file' {
    const u = String(url || '').toLowerCase().split('?')[0];
    if (/\.(jpe?g|png|gif|webp)$/.test(u)) return 'image';
    if (/\.(webm|ogg|mp3|m4a|wav|aac|opus)$/.test(u)) return 'audio';
    return 'file';
  }

  private async notifyRecipientPush(
    conv: { id: number; studentId: number; peerStudentId?: number | null; agentId: number | null },
    sender: { type: 'user' | 'agent'; id: number },
    msg: any,
  ) {
    let recipient: { type: 'user' | 'agent'; id: number } | null = null;
    if (sender.type === 'agent') {
      recipient = { type: 'user', id: conv.studentId };
    } else if (conv.peerStudentId) {
      recipient = {
        type: 'user',
        id: sender.id === conv.studentId ? conv.peerStudentId : conv.studentId,
      };
    } else if (conv.agentId) {
      recipient = { type: 'agent', id: conv.agentId };
    }
    if (!recipient) return;

    const title =
      sender.type === 'user'
        ? (msg.studentSender?.fullName || 'Étudiant')
        : (msg.agentSender?.agencyName || 'Agent');
    const body = this.mediaPushBody(msg);

    await this.push.notifyChatMessage({
      recipient,
      conversationId: conv.id,
      title,
      body,
    });
  }

  private mediaPushBody(msg: any): string {
    const url = String(msg?.mediaUrl || '');
    if (url) {
      const u = url.toLowerCase().split('?')[0];
      if (/\.(jpe?g|png|gif|webp)$/.test(u)) return '📷 Photo';
      if (/\.(webm|ogg|mp3|m4a|wav|aac|opus)$/.test(u)) return '🎤 Note vocale';
      return msg?.content ? `📎 ${String(msg.content).slice(0, 120)}` : '📎 Fichier';
    }
    return String(msg.content || 'Nouveau message').slice(0, 160);
  }

  async markRead(conversationId: number, subject: { type: 'user' | 'agent'; id: number }) {
    const conv = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conv) throw new NotFoundException();
    const data: any = {};
    if (subject.type === 'agent') {
      data.unreadAgentCount = 0;
    } else if (conv.peerStudentId) {
      if (subject.id === conv.studentId) data.unreadStudentCount = 0;
      else if (subject.id === conv.peerStudentId) data.unreadAgentCount = 0;
    } else {
      data.unreadStudentCount = 0;
    }
    await this.prisma.conversation.update({ where: { id: conversationId }, data });

    const now = new Date();
    await this.prisma.chatMessage.updateMany({
      where: {
        conversationId,
        readAt: null,
        isSystem: false,
        ...(subject.type === 'user'
          ? { NOT: { studentSenderId: subject.id } }
          : { NOT: { agentSenderId: subject.id } }),
      },
      data: { readAt: now },
    });

    return {
      conversationId,
      readAt: now.toISOString(),
      readerType: subject.type,
      readerId: subject.id,
    };
  }
}
