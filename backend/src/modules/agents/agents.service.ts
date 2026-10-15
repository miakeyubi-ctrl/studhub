import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PushService } from '../push/push.service';
import { JwtPayload } from '../../common/decorators/current-user.decorator';

@Injectable()
export class AgentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
  ) {}

  async findById(id: number) {
    const agent = await this.prisma.agent.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        agencyName: true,
        phone: true,
        activityType: true,
        activityCity: true,
        address: true,
        verified: true,
        tier: true,
        websiteUrl: true,
        description: true,
        avatarUrl: true,
        createdAt: true,
        _count: { select: { followers: true, properties: true } },
      },
    });
    if (!agent) throw new NotFoundException('Agent introuvable');
    return {
      id: agent.id,
      firstName: agent.firstName,
      lastName: agent.lastName,
      agencyName: agent.agencyName,
      phone: agent.phone,
      activityType: agent.activityType,
      activityCity: agent.activityCity,
      address: agent.address,
      verified: agent.verified,
      tier: agent.tier,
      websiteUrl: agent.websiteUrl,
      description: agent.description,
      avatarUrl: agent.avatarUrl,
      createdAt: agent.createdAt,
      followersCount: agent._count.followers,
      listingsCount: agent._count.properties,
    };
  }

  /** Complétion / édition du profil pro (après inscription). */
  async updateMe(me: JwtPayload, body: Record<string, unknown>) {
    if (me.type !== 'agent') throw new ForbiddenException('Réservé aux agents');

    const data: Record<string, string | null> = {};
    const str = (v: unknown) => (typeof v === 'string' ? v.trim() : null);

    if (body.firstName !== undefined) {
      const firstName = str(body.firstName);
      if (!firstName || firstName.length < 2) throw new BadRequestException('Prénom invalide');
      data.firstName = firstName;
    }
    if (body.lastName !== undefined) {
      const lastName = str(body.lastName);
      if (!lastName || lastName.length < 2) throw new BadRequestException('Nom invalide');
      data.lastName = lastName;
    }
    if (body.agencyName !== undefined) data.agencyName = str(body.agencyName) || null;
    if (body.phone !== undefined) {
      const phone = str(body.phone);
      if (!phone) throw new BadRequestException('Téléphone requis');
      data.phone = phone;
    }
    if (body.activityCity !== undefined) data.activityCity = str(body.activityCity) || null;
    if (body.address !== undefined) data.address = str(body.address) || null;
    if (body.websiteUrl !== undefined) data.websiteUrl = str(body.websiteUrl) || null;
    if (body.description !== undefined) data.description = str(body.description) || null;
    if (body.avatarUrl !== undefined) data.avatarUrl = str(body.avatarUrl) || null;

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('Aucun champ à mettre à jour');
    }

    return this.prisma.agent.update({
      where: { id: me.sub },
      data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        agencyName: true,
        phone: true,
        activityType: true,
        activityCity: true,
        address: true,
        websiteUrl: true,
        description: true,
        avatarUrl: true,
        verified: true,
        tier: true,
        role: true,
        updatedAt: true,
      },
    });
  }

  async followStatus(agentId: number, me: JwtPayload) {
    await this.ensureAgentExists(agentId);
    const follow = await this.findFollow(agentId, me);
    return {
      agentId,
      following: !!follow,
      followersCount: await this.prisma.agentFollow.count({ where: { agentId } }),
    };
  }

  async follow(agentId: number, me: JwtPayload) {
    await this.ensureAgentExists(agentId);
    this.assertCanFollow(agentId, me);

    const existing = await this.findFollow(agentId, me);
    if (existing) {
      return { following: true, created: false };
    }

    const data: any = { agentId };
    if (me.type === 'agent') data.followerAgentId = me.sub;
    else data.followerUserId = me.sub;

    await this.prisma.agentFollow.create({ data });
    return {
      following: true,
      created: true,
      followersCount: await this.prisma.agentFollow.count({ where: { agentId } }),
    };
  }

  async unfollow(agentId: number, me: JwtPayload) {
    await this.ensureAgentExists(agentId);
    const existing = await this.findFollow(agentId, me);
    if (existing) {
      await this.prisma.agentFollow.delete({ where: { id: existing.id } });
    }
    return {
      following: false,
      followersCount: await this.prisma.agentFollow.count({ where: { agentId } }),
    };
  }

  /** Notifie tous les abonnés qu’un agent a publié une annonce. */
  async notifyFollowersNewListing(params: {
    agentId: number;
    propertyId: number;
    title: string;
    city?: string;
  }) {
    const agent = await this.prisma.agent.findUnique({
      where: { id: params.agentId },
      select: { agencyName: true },
    });
    if (!agent) return;

    const followers = await this.prisma.agentFollow.findMany({
      where: { agentId: params.agentId },
      select: { followerAgentId: true, followerUserId: true },
    });
    if (!followers.length) return;

    const agency = agent.agencyName || 'Un agent';
    const title = 'Nouvelle annonce';
    const body = `${agency} a publié : ${params.title}${params.city ? ` · ${params.city}` : ''}`;

    await Promise.all(
      followers.map((f) => {
        if (f.followerAgentId) {
          return this.push.notifyGeneric({
            recipient: { type: 'agent', id: f.followerAgentId },
            title,
            body,
            data: {
              type: 'agent_listing',
              agentId: String(params.agentId),
              propertyId: String(params.propertyId),
            },
          });
        }
        if (f.followerUserId) {
          return this.push.notifyGeneric({
            recipient: { type: 'user', id: f.followerUserId },
            title,
            body,
            data: {
              type: 'agent_listing',
              agentId: String(params.agentId),
              propertyId: String(params.propertyId),
            },
          });
        }
        return Promise.resolve();
      }),
    );
  }

  private async ensureAgentExists(agentId: number) {
    const agent = await this.prisma.agent.findUnique({
      where: { id: agentId },
      select: { id: true },
    });
    if (!agent) throw new NotFoundException('Agent introuvable');
  }

  private assertCanFollow(agentId: number, me: JwtPayload) {
    if (me.type === 'agent' && Number(me.sub) === Number(agentId)) {
      throw new BadRequestException('Vous ne pouvez pas vous suivre vous-même');
    }
    if (me.type !== 'agent' && me.type !== 'user') {
      throw new ForbiddenException();
    }
  }

  private findFollow(agentId: number, me: JwtPayload) {
    if (me.type === 'agent') {
      return this.prisma.agentFollow.findUnique({
        where: {
          agentId_followerAgentId: {
            agentId,
            followerAgentId: me.sub,
          },
        },
      });
    }
    return this.prisma.agentFollow.findUnique({
      where: {
        agentId_followerUserId: {
          agentId,
          followerUserId: me.sub,
        },
      },
    });
  }
}
