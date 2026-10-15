import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ReportTargetType } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

const REASONS = new Set([
  'spam',
  'scam',
  'fake',
  'inappropriate',
  'wrong_info',
  'duplicate',
  'other',
]);

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async listMine(authorId: number) {
    const rows = await this.prisma.listingReport.findMany({
      where: { authorId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return Promise.all(
      rows.map(async (r) => {
        const target = await this.resolveTargetLabel(r.targetType, r.targetId);
        return {
          id: r.id,
          targetType: r.targetType,
          targetId: r.targetId,
          reason: r.reason,
          details: r.details,
          createdAt: r.createdAt,
          targetTitle: target.title,
          targetRoute: target.route,
        };
      }),
    );
  }

  private async resolveTargetLabel(type: ReportTargetType, id: number) {
    if (type === ReportTargetType.PROPERTY) {
      const p = await this.prisma.property.findUnique({
        where: { id },
        select: { title: true },
      });
      return {
        title: p?.title || `Logement #${id}`,
        route: `/detailsimmo/${id}`,
      };
    }
    if (type === ReportTargetType.PRODUCT) {
      const p = await this.prisma.product.findUnique({
        where: { id },
        select: { title: true },
      });
      return {
        title: p?.title || `Produit #${id}`,
        route: `/detailsproduit/${id}`,
      };
    }
    const p = await this.prisma.serviceProvider.findUnique({
      where: { id },
      select: { title: true },
    });
    return {
      title: p?.title || `Service #${id}`,
      route: `/detailsstudservices/${id}`,
    };
  }

  async create(authorId: number, body: any) {
    const targetType = this.mapTargetType(body?.targetType);
    const targetId = Number(body?.targetId);
    if (!Number.isFinite(targetId) || targetId <= 0) {
      throw new BadRequestException('targetId invalide');
    }
    const reason = String(body?.reason || '')
      .trim()
      .toLowerCase();
    if (!REASONS.has(reason)) {
      throw new BadRequestException(
        `Raison invalide. Attendu: ${[...REASONS].join(', ')}`,
      );
    }
    const details = body?.details ? String(body.details).trim().slice(0, 1000) : null;

    await this.assertTargetExists(targetType, targetId);

    try {
      const report = await this.prisma.listingReport.create({
        data: {
          authorId,
          targetType,
          targetId,
          reason,
          details,
        },
      });

      if (targetType === ReportTargetType.PROPERTY) {
        await this.prisma.property.update({
          where: { id: targetId },
          data: { isReported: true },
        });
      }

      return report;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Vous avez déjà signalé cette annonce');
      }
      throw e;
    }
  }

  private mapTargetType(raw: unknown): ReportTargetType {
    const key = String(raw || '')
      .trim()
      .toUpperCase();
    if (key === 'PROPERTY' || key === 'PRODUCT' || key === 'PROVIDER') {
      return key as ReportTargetType;
    }
    throw new BadRequestException('targetType invalide (PROPERTY | PRODUCT | PROVIDER)');
  }

  private async assertTargetExists(type: ReportTargetType, id: number) {
    if (type === ReportTargetType.PROPERTY) {
      const p = await this.prisma.property.findUnique({ where: { id }, select: { id: true } });
      if (!p) throw new NotFoundException('Annonce logement introuvable');
      return;
    }
    if (type === ReportTargetType.PRODUCT) {
      const p = await this.prisma.product.findUnique({ where: { id }, select: { id: true } });
      if (!p) throw new NotFoundException('Produit introuvable');
      return;
    }
    const p = await this.prisma.serviceProvider.findUnique({ where: { id }, select: { id: true } });
    if (!p) throw new NotFoundException('Prestataire introuvable');
  }
}
