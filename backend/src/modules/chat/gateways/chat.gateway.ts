import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from '../chat.service';
import { JwtPayload } from '../../../common/decorators/current-user.decorator';
import { PushService } from '../../push/push.service';

/**
 * Chat WebSocket Gateway
 *
 * Client → serveur :
 *   - join { conversationId }
 *   - leave { conversationId }
 *   - typing { conversationId, isTyping }
 *   - message { conversationId, content }
 *
 * Serveur → client :
 *   - newMessage
 *   - typing { conversationId, senderType, senderId, isTyping }
 *   - presence { conversationId, subjectType, subjectId, online }
 */
@WebSocketGateway({
  cors: {
    origin: (origin, cb) => cb(null, true),
    credentials: true,
  },
  path: '/ws/chat',
  transports: ['websocket', 'polling'],
  pingTimeout: 30000,
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(ChatGateway.name);
  /** Clé `${type}:${id}` → socketId + payload */
  private readonly clients = new Map<string, { socketId: string; user: JwtPayload }>();

  constructor(
    private readonly jwt: JwtService,
    private readonly cfg: ConfigService,
    private readonly chat: ChatService,
    private readonly push: PushService,
  ) {}

  private subjectKey(type: string, id: number | string): string {
    return `${type}:${id}`;
  }

  isOnline(type: string, id: number): boolean {
    return this.clients.has(this.subjectKey(type, id));
  }

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.accessToken as string) ||
        (client.handshake.headers?.authorization || '').replace('Bearer ', '');
      if (!token) { client.disconnect(); return; }
      const payload = (await this.jwt.verifyAsync(token, {
        secret: this.cfg.get('JWT_ACCESS_SECRET'),
        issuer: this.cfg.get('JWT_ISSUER'),
        audience: this.cfg.get('JWT_AUDIENCE'),
      })) as JwtPayload;
      const key = this.subjectKey(payload.type, payload.sub);
      this.clients.set(key, { socketId: client.id, user: payload });
      client.data.user = payload;
      this.logger.log(`WS connecté: ${key} (${client.id})`);
    } catch (err) {
      this.logger.warn(`WS connexion rejetée : ${err}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const u = client.data.user as JwtPayload | undefined;
    if (!u) return;
    const key = this.subjectKey(u.type, u.sub);
    this.clients.delete(key);
    this.logger.log(`WS déconnecté: ${key}`);

    // Notifier les rooms encore liées à ce socket
    const rooms = [...(client.rooms || [])].filter((r) => r.startsWith('conv-'));
    for (const room of rooms) {
      const conversationId = Number(room.replace('conv-', ''));
      if (!conversationId) continue;
      this.server.to(room).emit('presence', {
        conversationId,
        subjectType: u.type,
        subjectId: u.sub,
        online: false,
      });
    }
  }

  @SubscribeMessage('join')
  async join(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: number },
  ) {
    const user = client.data.user as JwtPayload;
    if (!user || !data?.conversationId) return { ok: false, error: 'auth/conversationId requis' };

    const conversationId = Number(data.conversationId);
    const room = `conv-${conversationId}`;
    client.join(room);

    // Annoncer mon online aux autres
    client.to(room).emit('presence', {
      conversationId,
      subjectType: user.type,
      subjectId: user.sub,
      online: true,
    });

    // Indiquer au joiner si le pair est en ligne
    try {
      const conv = await this.chat.getConversationMembers(conversationId);
      if (user.type === 'user' && conv.peerStudentId) {
        const peerId = user.sub === conv.studentId ? conv.peerStudentId : conv.studentId;
        client.emit('presence', {
          conversationId,
          subjectType: 'user',
          subjectId: peerId,
          online: this.isOnline('user', peerId),
        });
      } else {
        const peerType = user.type === 'user' ? 'agent' : 'user';
        const peerId = user.type === 'user' ? conv.agentId : conv.studentId;
        if (peerId != null) {
          client.emit('presence', {
            conversationId,
            subjectType: peerType,
            subjectId: peerId,
            online: this.isOnline(peerType, peerId),
          });
        }
      }
    } catch {
      /* conversation inconnue */
    }

    return { ok: true, joined: room };
  }

  @SubscribeMessage('leave')
  leave(@ConnectedSocket() client: Socket, @MessageBody() data: { conversationId: number }) {
    if (!data?.conversationId) return;
    const room = `conv-${data.conversationId}`;
    client.leave(room);
    const user = client.data.user as JwtPayload | undefined;
    if (user) {
      client.to(room).emit('presence', {
        conversationId: Number(data.conversationId),
        subjectType: user.type,
        subjectId: user.sub,
        online: false,
      });
    }
    return { ok: true };
  }

  @SubscribeMessage('typing')
  onTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: number; isTyping: boolean },
  ) {
    const user = client.data.user as JwtPayload;
    if (!user || !data?.conversationId) return;
    // Exclure l'émetteur
    client.to(`conv-${data.conversationId}`).emit('typing', {
      conversationId: Number(data.conversationId),
      senderType: user.type,
      senderId: user.sub,
      isTyping: !!data.isTyping,
    });
  }

  @SubscribeMessage('message')
  async onMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: number; content: string; mediaUrl?: string },
  ) {
    const user = client.data.user as JwtPayload;
    if (!user || !data?.conversationId) return { ok: false, error: 'requête invalide' };
    try {
      const sender = { type: user.type as 'user' | 'agent', id: user.sub };
      const msg = await this.chat.saveMessage(
        data.conversationId,
        sender,
        data.content || '',
        data.mediaUrl,
      );
      this.emitNewMessage(data.conversationId, msg);
      return { ok: true, message: msg };
    } catch (e: any) {
      return { ok: false, error: e?.message || 'Erreur envoi message' };
    }
  }

  /* ------------------------------------------------------------------ *
   *  APPELS WebRTC (signaling uniquement — pas de média sur le serveur) *
   * ------------------------------------------------------------------ */

  private async resolvePeer(conversationId: number, user: JwtPayload) {
    const conv = await this.chat.getConversationMembers(conversationId);
    if (user.type === 'user' && conv.peerStudentId) {
      const peerId = user.sub === conv.studentId ? conv.peerStudentId : conv.studentId;
      if (!peerId) return null;
      return { type: 'user' as const, id: peerId, key: this.subjectKey('user', peerId) };
    }
    const peerType = user.type === 'user' ? 'agent' : 'user';
    const peerId = user.type === 'user' ? conv.agentId : conv.studentId;
    if (!peerId) return null;
    return { type: peerType as 'user' | 'agent', id: peerId, key: this.subjectKey(peerType, peerId) };
  }

  private emitToPeer(peerKey: string, event: string, payload: any): boolean {
    const peer = this.clients.get(peerKey);
    if (!peer) return false;
    this.server.to(peer.socketId).emit(event, payload);
    return true;
  }

  @SubscribeMessage('call:invite')
  async onCallInvite(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: number; fromName?: string; peerName?: string },
  ) {
    const user = client.data.user as JwtPayload;
    if (!user || !data?.conversationId) return { ok: false, error: 'invalide' };
    const peer = await this.resolvePeer(Number(data.conversationId), user);
    if (!peer) return { ok: false, error: 'destinataire introuvable' };

    const fromName = (data as any).fromName || data.peerName || 'StudHub';
    const payload = {
      conversationId: Number(data.conversationId),
      fromType: user.type,
      fromId: user.sub,
      fromName,
    };

    const socketOk = this.emitToPeer(peer.key, 'call:incoming', payload);

    // Toujours tenter un push haute priorité pour réveiller l'appareil (veille / app tuée)
    void this.push.notifyIncomingCall({
      recipient: { type: peer.type, id: peer.id },
      conversationId: Number(data.conversationId),
      fromName,
    });

    if (!socketOk) {
      // Pas de socket : l'appel peut quand même aboutir via push → ouverture app → accept
      return { ok: true, via: 'push' };
    }
    return { ok: true, via: 'socket' };
  }

  @SubscribeMessage('call:accept')
  async onCallAccept(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: number },
  ) {
    const user = client.data.user as JwtPayload;
    if (!user || !data?.conversationId) return { ok: false };
    const peer = await this.resolvePeer(Number(data.conversationId), user);
    if (!peer) return { ok: false };
    this.emitToPeer(peer.key, 'call:accepted', {
      conversationId: Number(data.conversationId),
      fromType: user.type,
      fromId: user.sub,
    });
    return { ok: true };
  }

  @SubscribeMessage('call:reject')
  async onCallReject(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: number },
  ) {
    const user = client.data.user as JwtPayload;
    if (!user || !data?.conversationId) return { ok: false };
    const peer = await this.resolvePeer(Number(data.conversationId), user);
    if (!peer) return { ok: false };
    this.emitToPeer(peer.key, 'call:rejected', {
      conversationId: Number(data.conversationId),
    });
    return { ok: true };
  }

  @SubscribeMessage('call:offer')
  async onCallOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: number; sdp: any },
  ) {
    const user = client.data.user as JwtPayload;
    if (!user || !data?.conversationId || !data?.sdp) return { ok: false };
    const peer = await this.resolvePeer(Number(data.conversationId), user);
    if (!peer) return { ok: false };
    this.emitToPeer(peer.key, 'call:offer', {
      conversationId: Number(data.conversationId),
      sdp: data.sdp,
    });
    return { ok: true };
  }

  @SubscribeMessage('call:answer')
  async onCallAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: number; sdp: any },
  ) {
    const user = client.data.user as JwtPayload;
    if (!user || !data?.conversationId || !data?.sdp) return { ok: false };
    const peer = await this.resolvePeer(Number(data.conversationId), user);
    if (!peer) return { ok: false };
    this.emitToPeer(peer.key, 'call:answer', {
      conversationId: Number(data.conversationId),
      sdp: data.sdp,
    });
    return { ok: true };
  }

  @SubscribeMessage('call:ice')
  async onCallIce(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: number; candidate: any },
  ) {
    const user = client.data.user as JwtPayload;
    if (!user || !data?.conversationId || !data?.candidate) return { ok: false };
    const peer = await this.resolvePeer(Number(data.conversationId), user);
    if (!peer) return { ok: false };
    this.emitToPeer(peer.key, 'call:ice', {
      conversationId: Number(data.conversationId),
      candidate: data.candidate,
    });
    return { ok: true };
  }

  @SubscribeMessage('call:mute')
  async onCallMute(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: number; muted: boolean; fromName?: string },
  ) {
    const user = client.data.user as JwtPayload;
    if (!user || !data?.conversationId) return { ok: false };
    const peer = await this.resolvePeer(Number(data.conversationId), user);
    if (!peer) return { ok: false };
    this.emitToPeer(peer.key, 'call:peer-mute', {
      conversationId: Number(data.conversationId),
      muted: !!data.muted,
      fromName: data.fromName || 'StudHub',
    });
    return { ok: true };
  }

  @SubscribeMessage('call:hold')
  async onCallHold(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: number; onHold: boolean; fromName?: string },
  ) {
    const user = client.data.user as JwtPayload;
    if (!user || !data?.conversationId) return { ok: false };
    const peer = await this.resolvePeer(Number(data.conversationId), user);
    if (!peer) return { ok: false };
    this.emitToPeer(peer.key, 'call:peer-hold', {
      conversationId: Number(data.conversationId),
      onHold: !!data.onHold,
      fromName: data.fromName || 'StudHub',
    });
    return { ok: true };
  }

  @SubscribeMessage('call:end')
  async onCallEnd(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: number },
  ) {
    const user = client.data.user as JwtPayload;
    if (!user || !data?.conversationId) return { ok: false };
    const peer = await this.resolvePeer(Number(data.conversationId), user);
    if (peer) {
      this.emitToPeer(peer.key, 'call:ended', {
        conversationId: Number(data.conversationId),
      });
    }
    return { ok: true };
  }

  /** Diffuse un message à tous les clients de la conversation (HTTP ou WS). */
  emitNewMessage(conversationId: number, msg: any): void {
    if (!this.server || !conversationId || !msg) return;
    this.server.to(`conv-${conversationId}`).emit('newMessage', msg);
  }

  /** Accusés de lecture : le pair a ouvert la conversation. */
  emitMessagesRead(
    conversationId: number,
    payload: { readAt: string; readerType: string; readerId: number },
  ): void {
    if (!this.server || !conversationId) return;
    this.server.to(`conv-${conversationId}`).emit('messagesRead', {
      conversationId,
      ...payload,
    });
  }
}
