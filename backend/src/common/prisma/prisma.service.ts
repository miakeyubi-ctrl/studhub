import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * PrismaService - Singleton global injectable dans n'importe quel module
 * (rendu global par PrismaModule)
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      log:
        process.env.NODE_ENV !== 'production'
          ? ['error', 'warn']
          : ['error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Helper pagination : offset + limit avec { items, meta }
   */
  async paginate<T, A extends { take?: number; skip?: number; [k: string]: any }>(
    delegate: any,
    args: A,
  ) {
    const take = Number(args.take ?? 20);
    const skip = Number(args.skip ?? 0);
    const [items, total] = await Promise.all([
      delegate.findMany({ ...args, take, skip }),
      delegate.count({ where: args.where }),
    ]) as unknown as [T[], number];
    return {
      items,
      meta: {
        total,
        page: Math.floor(skip / take) + 1,
        perPage: take,
        totalPages: Math.ceil(total / take),
      },
    };
  }
}
