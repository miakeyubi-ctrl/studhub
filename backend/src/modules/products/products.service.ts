import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import { assertOwner } from '../../common/ownership/assert-owner';

export interface ListingViewContext {
  user?: JwtPayload | null;
}

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(q: any) {
    const where: any = {};
    if (q.category) where.category = q.category;
    if (q.sellerId) where.sellerId = Number(q.sellerId);
    if (q.search) where.title = { contains: q.search, mode: 'insensitive' };
    if (q.isSold !== undefined) where.isSold = q.isSold === 'true';
    if (q.city) {
      const city = String(q.city).split(',')[0].trim();
      if (city) where.location = { contains: city, mode: 'insensitive' };
    }

    const take = Math.min(Number(q.limit || 50), 100);
    const skip = Number(((q.page || 1) - 1) * take);
    const [items, total] = await Promise.all([
      this.prisma.product.findMany({ where, take, skip, orderBy: { createdAt: 'desc' }, include: { seller: { select: { id:true, fullName:true, phone:true, avatarUrl:true } } } }),
      this.prisma.product.count({ where }),
    ]);
    return { items, meta: { total, page: Number(q.page || 1), perPage: take, totalPages: Math.ceil(total / take) } };
  }

  async findById(id: number, viewCtx?: ListingViewContext) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { seller: true },
    });
    if (!product) throw new NotFoundException('Produit introuvable');

    const isNewView = await this.recordProductView(id, viewCtx);
    if (!isNewView) {
      return product;
    }

    return this.prisma.product.update({
      where: { id },
      data: { viewsCount: { increment: 1 } },
      include: { seller: true },
    });
  }

  create(userId: number, data: any) {
    return this.prisma.product.create({ data: { ...data, sellerId: userId } });
  }

  async update(userId: number, id: number, data: any) {
    const p = await this.prisma.product.findUnique({ where: { id } });
    assertOwner(p, 'sellerId', userId, {
      forbidden: 'Vous ne pouvez pas modifier cette annonce',
    });
    return this.prisma.product.update({ where: { id }, data });
  }

  async delete(userId: number, id: number) {
    const p = await this.prisma.product.findUnique({ where: { id } });
    assertOwner(p, 'sellerId', userId, {
      forbidden: 'Vous ne pouvez pas supprimer cette annonce',
    });
    await this.prisma.product.delete({ where: { id } });
    return { deleted: true, id };
  }

  async toggleLike(userId: number, productId: number) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Produit introuvable');
    const existing = await this.prisma.productLike.findUnique({
      where: { userId_productId: { userId, productId } },
    });
    if (existing) {
      await this.prisma.productLike.delete({ where: { userId_productId: { userId, productId } } });
      await this.prisma.product.update({
        where: { id: productId },
        data: { likesCount: { decrement: 1 } },
      });
      return { liked: false, likesCount: Math.max(0, (product.likesCount ?? 0) - 1) };
    }
    await this.prisma.productLike.create({ data: { userId, productId } });
    const updated = await this.prisma.product.update({
      where: { id: productId },
      data: { likesCount: { increment: 1 } },
    });
    return { liked: true, likesCount: updated.likesCount };
  }

  async toggleFavorite(userId: number, productId: number) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Produit introuvable');
    const existing = await this.prisma.productFavorite.findUnique({
      where: { userId_productId: { userId, productId } },
    });
    if (existing) {
      await this.prisma.productFavorite.delete({ where: { userId_productId: { userId, productId } } });
      return { favorited: false };
    }
    await this.prisma.productFavorite.create({ data: { userId, productId } });
    return { favorited: true };
  }

  async listFavorites(userId: number) {
    const rows = await this.prisma.productFavorite.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { product: { include: { seller: { select: { id: true, fullName: true, phone: true, avatarUrl: true } } } } },
    });
    return { items: rows.map((r) => r.product) };
  }

  private async recordProductView(productId: number, ctx?: ListingViewContext): Promise<boolean> {
    const user = ctx?.user;
    if (!user?.sub || user.type !== 'user') return false;

    try {
      await this.prisma.productView.create({
        data: { productId, userId: user.sub },
      });
      return true;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') return false;
      throw e;
    }
  }
}
