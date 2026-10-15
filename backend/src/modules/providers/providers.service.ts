import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { assertOwner } from '../../common/ownership/assert-owner';

@Injectable()
export class ProvidersService {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(q: any) {
    const where: any = {};
    if (q.category) where.category = q.category;
    if (q.tier) where.tier = q.tier;
    if (q.city) {
      const city = String(q.city).split(',')[0].trim();
      if (city) where.city = { contains: city, mode: 'insensitive' };
    }
    const [items, total] = await Promise.all([
      this.prisma.serviceProvider.findMany({
        where, orderBy: [{ tier: 'desc' }, { ratingAvg: 'desc' }, { reviewsCount: 'desc' }],
        include: { user: { select: { id:true, fullName:true, avatarUrl:true, phone:true } } },
      }),
      this.prisma.serviceProvider.count({ where }),
    ]);
    return { items, total };
  }

  async findById(id: number) {
    const p = await this.prisma.serviceProvider.findUnique({ where: { id }, include: { user: true, reviews: true } });
    if (!p) throw new NotFoundException();
    return p;
  }

  create(userId: number, data: any) {
    const payload: any = {
      userId,
      category: data.category,
      title: String(data.title || '').trim(),
      bio: data.bio ? String(data.bio).trim() : null,
      phoneContact: String(data.phoneContact || '').trim(),
      emailContact: data.emailContact ? String(data.emailContact).trim() : null,
      city: String(data.city || '').trim(),
      portfolioUrls: Array.isArray(data.portfolioUrls)
        ? data.portfolioUrls.filter((u: any) => !!u)
        : [],
    };
    if (data.priceStart != null && data.priceStart !== '') payload.priceStart = Number(data.priceStart);
    if (data.priceEnd != null && data.priceEnd !== '') payload.priceEnd = Number(data.priceEnd);
    if (data.tier) payload.tier = data.tier;

    return this.prisma.serviceProvider.create({
      data: payload,
      include: { user: { select: { id: true, fullName: true, avatarUrl: true, phone: true } } },
    });
  }

  async update(userId: number, id: number, data: any) {
    const p = await this.prisma.serviceProvider.findUnique({ where: { id } });
    assertOwner(p, 'userId', userId, {
      forbidden: 'Vous ne pouvez pas modifier ce service',
    });
    return this.prisma.serviceProvider.update({ where: { id }, data });
  }

  async toggleFavorite(userId: number, providerId: number) {
    const provider = await this.prisma.serviceProvider.findUnique({ where: { id: providerId } });
    if (!provider) throw new NotFoundException('Prestataire introuvable');
    const existing = await this.prisma.providerFavorite.findUnique({
      where: { userId_providerId: { userId, providerId } },
    });
    if (existing) {
      await this.prisma.providerFavorite.delete({ where: { userId_providerId: { userId, providerId } } });
      return { favorited: false };
    }
    await this.prisma.providerFavorite.create({ data: { userId, providerId } });
    return { favorited: true };
  }

  async listFavorites(userId: number) {
    const rows = await this.prisma.providerFavorite.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { provider: { include: { user: { select: { id: true, fullName: true, avatarUrl: true, phone: true } } } } },
    });
    return { items: rows.map((r) => r.provider) };
  }
}
