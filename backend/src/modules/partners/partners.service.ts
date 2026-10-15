import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CreatePartnerAnnouncementDto,
  CreatePartnerDto,
  PartnerQueryDto,
  UpdatePartnerAnnouncementDto,
  UpdatePartnerDto,
} from './dto/partner.dto';

const ANNOUNCEMENT_SELECT = {
  id: true,
  partnerId: true,
  title: true,
  description: true,
  discount: true,
  promoCode: true,
  imageUrl: true,
  isActive: true,
  validUntil: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.PartnerAnnouncementSelect;

const PUBLIC_SELECT = {
  id: true,
  name: true,
  category: true,
  offer: true,
  description: true,
  discount: true,
  promoCode: true,
  logoUrl: true,
  coverUrl: true,
  websiteUrl: true,
  phone: true,
  email: true,
  loginEmail: true,
  city: true,
  address: true,
  validUntil: true,
  isActive: true,
  sortOrder: true,
  viewsCount: true,
  likesCount: true,
  clicksCount: true,
  createdAt: true,
  updatedAt: true,
  // passwordHash jamais exposé
} satisfies Prisma.PartnerSelect;

@Injectable()
export class PartnersService {
  constructor(private readonly prisma: PrismaService) {}

  private buildWhere(q: PartnerQueryDto, onlyActive: boolean): Prisma.PartnerWhereInput {
    const where: Prisma.PartnerWhereInput = {};
    if (onlyActive) {
      where.isActive = true;
      where.OR = [{ validUntil: null }, { validUntil: { gte: new Date() } }];
    }
    if (q.category) where.category = { equals: q.category, mode: 'insensitive' };
    const search = q.search?.trim();
    if (search) {
      where.AND = [{
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { offer: { contains: search, mode: 'insensitive' } },
          { category: { contains: search, mode: 'insensitive' } },
        ],
      }];
    }
    return where;
  }

  private readonly orderBy: Prisma.PartnerOrderByWithRelationInput[] = [
    { sortOrder: 'asc' },
    { createdAt: 'desc' },
  ];

  async findActive(q: PartnerQueryDto) {
    const where = this.buildWhere(q, true);
    const [items, total] = await Promise.all([
      this.prisma.partner.findMany({ where, orderBy: this.orderBy, select: PUBLIC_SELECT }),
      this.prisma.partner.count({ where }),
    ]);
    return { items, total };
  }

  async findActiveById(id: number) {
    const existing = await this.prisma.partner.findFirst({ where: { id, isActive: true } });
    if (!existing) throw new NotFoundException('Partenaire introuvable');
    return this.prisma.partner.update({
      where: { id },
      data: { viewsCount: { increment: 1 } },
      select: PUBLIC_SELECT,
    });
  }

  async findAll(q: PartnerQueryDto) {
    const where = this.buildWhere(q, false);
    const [items, total] = await Promise.all([
      this.prisma.partner.findMany({ where, orderBy: this.orderBy, select: PUBLIC_SELECT }),
      this.prisma.partner.count({ where }),
    ]);
    return { items, total };
  }

  async findById(id: number) {
    const p = await this.prisma.partner.findUnique({ where: { id }, select: PUBLIC_SELECT });
    if (!p) throw new NotFoundException('Partenaire introuvable');
    return p;
  }

  async findMe(partnerId: number) {
    const p = await this.prisma.partner.findUnique({ where: { id: partnerId }, select: PUBLIC_SELECT });
    if (!p) throw new NotFoundException('Partenaire introuvable');
    return p;
  }

  async create(dto: CreatePartnerDto) {
    const data = await this.toCreateData(dto);
    return this.prisma.partner.create({ data, select: PUBLIC_SELECT });
  }

  async update(id: number, dto: UpdatePartnerDto) {
    await this.findById(id);
    const data = await this.toUpdateData(dto, id);
    return this.prisma.partner.update({ where: { id }, data, select: PUBLIC_SELECT });
  }

  async remove(id: number) {
    await this.findById(id);
    await this.prisma.partner.delete({ where: { id } });
  }

  async trackClick(id: number) {
    await this.findById(id);
    return this.prisma.partner.update({
      where: { id },
      data: { clicksCount: { increment: 1 } },
      select: { id: true, clicksCount: true, viewsCount: true, likesCount: true },
    });
  }

  async trackLike(id: number) {
    await this.findById(id);
    return this.prisma.partner.update({
      where: { id },
      data: { likesCount: { increment: 1 } },
      select: { id: true, likesCount: true, viewsCount: true, clicksCount: true },
    });
  }

  async stats() {
    const agg = await this.prisma.partner.aggregate({
      _sum: { viewsCount: true, likesCount: true, clicksCount: true },
      _count: { _all: true },
    });
    return {
      partners: agg._count._all,
      views: agg._sum.viewsCount ?? 0,
      likes: agg._sum.likesCount ?? 0,
      clicks: agg._sum.clicksCount ?? 0,
    };
  }

  // ---------- Annonces partenaire (uniquement Role.PARTNER) ----------

  async listPublicAnnouncements(partnerId: number) {
    const partner = await this.prisma.partner.findFirst({
      where: { id: partnerId, isActive: true },
      select: { id: true },
    });
    if (!partner) throw new NotFoundException('Partenaire introuvable');
    return this.prisma.partnerAnnouncement.findMany({
      where: {
        partnerId,
        isActive: true,
        OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
      },
      orderBy: { createdAt: 'desc' },
      select: ANNOUNCEMENT_SELECT,
    });
  }

  async listMyAnnouncements(partnerId: number) {
    await this.findMe(partnerId);
    return this.prisma.partnerAnnouncement.findMany({
      where: { partnerId },
      orderBy: { createdAt: 'desc' },
      select: ANNOUNCEMENT_SELECT,
    });
  }

  async createAnnouncement(partnerId: number, dto: CreatePartnerAnnouncementDto) {
    await this.findMe(partnerId);
    const data = this.cleanAnnouncementData(dto as unknown as Record<string, unknown>);
    if (!data.title) throw new BadRequestException('Titre requis');
    return this.prisma.partnerAnnouncement.create({
      data: {
        partnerId,
        title: String(data.title),
        description: (data.description as string | null) ?? null,
        discount: (data.discount as string | null) ?? null,
        promoCode: (data.promoCode as string | null) ?? null,
        imageUrl: (data.imageUrl as string | null) ?? null,
        isActive: data.isActive === undefined ? true : Boolean(data.isActive),
        validUntil: (data.validUntil as Date | null) ?? null,
      },
      select: ANNOUNCEMENT_SELECT,
    });
  }

  async updateAnnouncement(partnerId: number, announcementId: number, dto: UpdatePartnerAnnouncementDto) {
    await this.assertOwnAnnouncement(partnerId, announcementId);
    const data = this.cleanAnnouncementData(dto as unknown as Record<string, unknown>);
    return this.prisma.partnerAnnouncement.update({
      where: { id: announcementId },
      data,
      select: ANNOUNCEMENT_SELECT,
    });
  }

  async removeAnnouncement(partnerId: number, announcementId: number) {
    await this.assertOwnAnnouncement(partnerId, announcementId);
    await this.prisma.partnerAnnouncement.delete({ where: { id: announcementId } });
  }

  private async assertOwnAnnouncement(partnerId: number, announcementId: number) {
    const a = await this.prisma.partnerAnnouncement.findUnique({
      where: { id: announcementId },
      select: { id: true, partnerId: true },
    });
    if (!a) throw new NotFoundException('Annonce introuvable');
    if (a.partnerId !== partnerId) throw new ForbiddenException('Cette annonce ne vous appartient pas');
    return a;
  }

  private cleanAnnouncementData(dto: Record<string, unknown>): Record<string, unknown> {
    const data: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(dto)) {
      if (value === undefined) continue;
      if (typeof value === 'string') {
        const trimmed = value.trim();
        data[key] = trimmed === '' ? null : trimmed;
      } else {
        data[key] = value;
      }
    }
    if (typeof data.validUntil === 'string') data.validUntil = new Date(data.validUntil);
    return data;
  }

  private async assertLoginEmailFree(loginEmail: string, excludeId?: number) {
    const existing = await this.prisma.partner.findUnique({
      where: { loginEmail },
      select: { id: true },
    });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException('Cet email de connexion est déjà utilisé');
    }
  }

  private async toCreateData(dto: CreatePartnerDto): Promise<Prisma.PartnerCreateInput> {
    const { password, loginEmail, ...rest } = dto as CreatePartnerDto & { password?: string };
    const data = this.cleanStrings(rest) as Prisma.PartnerCreateInput;

    const login = loginEmail?.trim().toLowerCase() || undefined;
    if (login) {
      await this.assertLoginEmailFree(login);
      data.loginEmail = login;
    }
    if (password != null && String(password).trim() !== '') {
      if (String(password).length < 6) {
        throw new BadRequestException('Le mot de passe doit contenir au moins 6 caractères');
      }
      if (!login) {
        throw new BadRequestException('Email de connexion requis pour définir un mot de passe');
      }
      data.passwordHash = await bcrypt.hash(String(password), 10);
    }
    return data;
  }

  private async toUpdateData(dto: UpdatePartnerDto, id: number): Promise<Prisma.PartnerUpdateInput> {
    const { password, loginEmail, ...rest } = dto as UpdatePartnerDto & { password?: string };
    const data = this.cleanStrings(rest) as Prisma.PartnerUpdateInput;

    if (loginEmail !== undefined) {
      const login = String(loginEmail || '').trim().toLowerCase();
      if (login === '') {
        data.loginEmail = null;
        data.passwordHash = null;
      } else {
        await this.assertLoginEmailFree(login, id);
        data.loginEmail = login;
      }
    }
    if (password != null && String(password).trim() !== '') {
      if (String(password).length < 6) {
        throw new BadRequestException('Le mot de passe doit contenir au moins 6 caractères');
      }
      const current = await this.prisma.partner.findUnique({
        where: { id },
        select: { loginEmail: true },
      });
      const effectiveLogin = (data.loginEmail as string | null | undefined) ?? current?.loginEmail;
      if (!effectiveLogin) {
        throw new BadRequestException('Email de connexion requis pour définir un mot de passe');
      }
      data.passwordHash = await bcrypt.hash(String(password), 10);
    }
    return data;
  }

  private cleanStrings(dto: Record<string, unknown>): Record<string, unknown> {
    const data: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(dto)) {
      if (value === undefined) continue;
      if (key === 'password' || key === 'passwordHash') continue;
      if (typeof value === 'string') {
        const trimmed = value.trim();
        data[key] = trimmed === '' ? null : trimmed;
      } else {
        data[key] = value;
      }
    }
    if (typeof data.validUntil === 'string') data.validUntil = new Date(data.validUntil);
    return data;
  }
}
