import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { assertOwner } from '../../common/ownership/assert-owner';

@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(q: any) {
    const where: any = {};
    if (q.associationTag) where.associationTag = q.associationTag;
    const take = Math.min(Number(q.limit || 50), 100);
    const skip = Number(((q.page || 1) - 1) * take);
    const [items, total] = await Promise.all([
      this.prisma.feedPost.findMany({
        where, take, skip,
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id:true, fullName:true, avatarUrl:true, university:true } },
          likes:    false,
          comments: { take: 3, orderBy: { createdAt: 'desc' }, include: { author: { select: { id:true, fullName:true, avatarUrl:true } } } },
        },
      }),
      this.prisma.feedPost.count({ where }),
    ]);
    return { items, meta: { total, page: Number(q.page || 1), perPage: take, totalPages: Math.ceil(total / take) } };
  }

  async findById(id: number) {
    const p = await this.prisma.feedPost.findUnique({ where: { id }, include: { author: true, comments: { include: { author: true } } } });
    if (!p) throw new NotFoundException();
    return p;
  }

  create(userId: number, data: any) {
    return this.prisma.feedPost.create({
      data: {
        authorId: userId,
        text: data.text,
        imageUrl: data.imageUrl || null,
        associationTag: data.associationTag || null,
        eventDate: data.eventDate ? new Date(data.eventDate) : null,
      },
      include: {
        author: { select: { id: true, fullName: true, avatarUrl: true, university: true } },
      },
    });
  }

  async delete(userId: number, id: number) {
    const p = await this.prisma.feedPost.findUnique({ where: { id } });
    assertOwner(p, 'authorId', userId, {
      forbidden: 'Vous ne pouvez pas supprimer cette publication',
    });
    await this.prisma.feedPost.delete({ where: { id } });
    return { deleted: true, id };
  }

  async toggleLike(userId: number, postId: number) {
    const post = await this.prisma.feedPost.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException();
    const existing = await this.prisma.like.findUnique({ where: { postId_userId: { postId, userId } } });
    if (existing) {
      await this.prisma.like.delete({ where: { postId_userId: { postId, userId } } });
      await this.prisma.feedPost.update({ where: { id: postId }, data: { likesCount: { decrement: 1 } } });
      return { liked: false, likesCount: Math.max(0, post.likesCount - 1) };
    }
    await this.prisma.like.create({ data: { userId, postId } });
    const updated = await this.prisma.feedPost.update({ where: { id: postId }, data: { likesCount: { increment: 1 } } });
    return { liked: true, likesCount: updated.likesCount };
  }

  async addComment(userId: number, postId: number, text: string) {
    if (!text?.trim()) throw new ForbiddenException('Commentaire vide');
    const post = await this.prisma.feedPost.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException();
    const c = await this.prisma.comment.create({
      data: { postId, authorId: userId, text: text.trim() },
      include: { author: { select: { id:true, fullName:true, avatarUrl:true } } },
    });
    await this.prisma.feedPost.update({ where: { id: postId }, data: { commentsCount: { increment: 1 } } });
    return c;
  }

  async getComments(postId: number, q: any) {
    const take = Math.min(Number(q.limit || 30), 100);
    return this.prisma.comment.findMany({
      where: { postId },
      orderBy: { createdAt: 'desc' },
      take,
      include: { author: { select: { id:true, fullName:true, avatarUrl:true } } },
    });
  }
}
