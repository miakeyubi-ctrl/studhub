import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InboxNotifType } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { JwtPayload } from '../../common/decorators/current-user.decorator';

const NOTIF_TYPES = new Set<string>(Object.values(InboxNotifType));

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(actor: JwtPayload) {
    const rows = await this.prisma.inboxNotification.findMany({
      where: this.owner(actor),
      orderBy: { createdAt: 'desc' },
      take: 60,
    });
    return rows.map((row) => this.toFront(row));
  }

  async create(actor: JwtPayload, body: any) {
    const title = String(body?.title || '').trim().slice(0, 200);
    if (!title) throw new BadRequestException('Titre requis');
    const type = this.toDbType(body?.type);
    const route = body?.route ? String(body.route).slice(0, 300) : null;
    const clientKey = body?.clientKey ? String(body.clientKey).slice(0, 120) : null;
    const text = body?.body ? String(body.body).slice(0, 4000) : null;
    const coalesce = body?.coalesce !== false && type === InboxNotifType.MESSAGE && !!clientKey;
    const owner = this.owner(actor);

    if (coalesce && clientKey) {
      const existing = await this.prisma.inboxNotification.findFirst({
        where: { ...owner, clientKey, read: false, type: InboxNotifType.MESSAGE },
        orderBy: { createdAt: 'desc' },
      });
      if (existing) {
        const count = (existing.count || 1) + 1;
        const updated = await this.prisma.inboxNotification.update({
          where: { id: existing.id },
          data: { title, body: text, route, count, createdAt: new Date() },
        });
        return this.toFront(updated);
      }
    }

    const created = await this.prisma.inboxNotification.create({
      data: {
        ...owner,
        type,
        title,
        body: text,
        route,
        clientKey,
        count: 1,
        read: false,
      },
    });
    return this.toFront(created);
  }

  async markRead(actor: JwtPayload, id: number) {
    await this.assertOwned(actor, id);
    const updated = await this.prisma.inboxNotification.update({
      where: { id },
      data: { read: true },
    });
    return this.toFront(updated);
  }

  async markRouteRead(actor: JwtPayload, route: string) {
    const clean = String(route || '').trim();
    if (!clean) throw new BadRequestException('Route requise');
    await this.prisma.inboxNotification.updateMany({
      where: { ...this.owner(actor), route: clean },
      data: { read: true },
    });
    return { ok: true };
  }

  async markAllRead(actor: JwtPayload) {
    await this.prisma.inboxNotification.updateMany({
      where: { ...this.owner(actor), read: false },
      data: { read: true },
    });
    return { ok: true };
  }

  async remove(actor: JwtPayload, id: number) {
    await this.assertOwned(actor, id);
    await this.prisma.inboxNotification.delete({ where: { id } });
    return { ok: true };
  }

  async clear(actor: JwtPayload) {
    await this.prisma.inboxNotification.deleteMany({ where: this.owner(actor) });
    return { ok: true };
  }

  private owner(actor: JwtPayload): { userId: number } | { agentId: number } {
    if (actor.type === 'agent') return { agentId: actor.sub };
    if (actor.type === 'user') return { userId: actor.sub };
    throw new ForbiddenException('Notifications indisponibles pour ce compte');
  }

  private async assertOwned(actor: JwtPayload, id: number) {
    const row = await this.prisma.inboxNotification.findFirst({
      where: { id, ...this.owner(actor) },
      select: { id: true },
    });
    if (!row) throw new NotFoundException('Notification introuvable');
  }

  private toDbType(raw: unknown): InboxNotifType {
    const value = String(raw || 'SYSTEM').trim().toUpperCase();
    if (!NOTIF_TYPES.has(value)) return InboxNotifType.SYSTEM;
    return value as InboxNotifType;
  }

  private toFront(row: {
    id: number;
    type: InboxNotifType;
    title: string;
    body: string | null;
    route: string | null;
    read: boolean;
    count: number;
    createdAt: Date;
  }) {
    return {
      id: String(row.id),
      type: row.type.toLowerCase(),
      title: row.title,
      body: row.body || '',
      route: row.route || undefined,
      read: row.read,
      count: row.count,
      createdAt: row.createdAt.getTime(),
    };
  }
}
