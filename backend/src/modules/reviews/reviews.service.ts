import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ReviewTargetType } from '@prisma/client';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  private buildWhereByTarget(targetType: ReviewTargetType, targetId: number) {
    switch (targetType) {
      case ReviewTargetType.PROPERTY:
        return { targetType, propertyId: targetId };
      case ReviewTargetType.PRODUCT:
        return { targetType, productId: targetId };
      case ReviewTargetType.PROVIDER:
        return { targetType, providerId: targetId };
    }
  }

  async list(targetType: ReviewTargetType, targetId: number) {
    return this.prisma.review.findMany({
      where: this.buildWhereByTarget(targetType, targetId),
      orderBy: { createdAt: 'desc' },
      include: { author: { select: { id:true, fullName:true, avatarUrl:true } } },
    });
  }

  async create(authorId: number, dto: any) {
    const rating = Math.max(1, Math.min(5, Number(dto.rating) || 5));
    const targetType = dto.targetType as ReviewTargetType;
    const targetIdNum = Number(dto.targetId);

    const data: any = {
      authorId,
      targetType,
      rating,
      comment: dto.comment,
      propertyId: targetType === ReviewTargetType.PROPERTY ? targetIdNum : null,
      productId:  targetType === ReviewTargetType.PRODUCT  ? targetIdNum : null,
      providerId: targetType === ReviewTargetType.PROVIDER ? targetIdNum : null,
    };

    const r = await this.prisma.review.create({ data });

    if (targetType === ReviewTargetType.PROVIDER) {
      const stats = await this.prisma.review.aggregate({
        where: this.buildWhereByTarget(ReviewTargetType.PROVIDER, targetIdNum),
        _avg: { rating: true },
        _count: { _all: true },
      });
      const avgRating = Number(stats?._avg?.rating || 0);
      const countReviews = Number(stats?._count?._all || 0);
      await this.prisma.serviceProvider.update({
        where: { id: targetIdNum },
        data: { ratingAvg: avgRating, reviewsCount: countReviews },
      });
    }
    return r;
  }
}
