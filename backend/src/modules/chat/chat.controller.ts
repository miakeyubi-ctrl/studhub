import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { ChatGateway } from './gateways/chat.gateway';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('Chat')
@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-AUTH')
export class ChatController {
  constructor(
    private readonly chat: ChatService,
    private readonly gateway: ChatGateway,
  ) {}

  @Get('conversations')
  list(@CurrentUser() u: JwtPayload) {
    const subject = { type: u.type as 'user' | 'agent', id: u.sub };
    return this.chat.listConversationsFor(subject);
  }

  @Post('conversations')
  createOrGet(
    @CurrentUser() u: JwtPayload,
    @Body('targetId', ParseIntPipe) targetId: number,
    @Body('targetType') targetType: 'user' | 'agent',
  ) {
    const subject = { type: u.type as 'user' | 'agent', id: u.sub };
    return this.chat.getOrCreateConversation(subject, { type: targetType, id: targetId });
  }

  /** Crée (si besoin) le message de bienvenue système StudHub — non répondable. */
  @Post('conversations/system-welcome')
  async systemWelcome(
    @CurrentUser() u: JwtPayload,
    @Body('firstName') firstName?: string,
  ) {
    if (u.type !== 'user') {
      return { created: false };
    }
    const result = await this.chat.ensureStudhubWelcome(u.sub, firstName);
    if (result.created && result.conversation?.messages?.[0]) {
      this.gateway.emitNewMessage(result.conversation.id, {
        ...result.conversation.messages[0],
        isSystem: true,
      });
    }
    return result;
  }

  @Get('conversations/:id/messages')
  messages(
    @Param('id', ParseIntPipe) id: number,
    @Query('limit') limit?: number,
    @Query('beforeId') beforeId?: number,
  ) {
    return this.chat.getMessages(id, Number(limit || 50), beforeId ? Number(beforeId) : undefined);
  }

  @Post('messages')
  async send(
    @CurrentUser() u: JwtPayload,
    @Body('conversationId', ParseIntPipe) conversationId: number,
    @Body('content') content: string,
    @Body('mediaUrl') mediaUrl?: string,
  ) {
    const sender = { type: u.type as 'user' | 'agent', id: u.sub };
    const msg = await this.chat.saveMessage(conversationId, sender, content, mediaUrl);
    // Temps réel : pousse le message aux participants connectés en WS
    this.gateway.emitNewMessage(conversationId, msg);
    return msg;
  }

  @Post('conversations/:id/read')
  async read(@CurrentUser() u: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    const result = await this.chat.markRead(id, { type: u.type as 'user' | 'agent', id: u.sub });
    this.gateway.emitMessagesRead(id, {
      readAt: result.readAt,
      readerType: result.readerType,
      readerId: result.readerId,
    });
    return result;
  }
}
