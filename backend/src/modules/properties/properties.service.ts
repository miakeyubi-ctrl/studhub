import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { assertOwner } from '../../common/ownership/assert-owner';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PropertyCategory, Prisma } from '@prisma/client';
import { AgentsService } from '../agents/agents.service';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import { parseOptionalCoord, resolveCoords } from '../../common/geo/city-coords';

export interface ListingViewContext {
  user?: JwtPayload | null;
}

const CATEGORY_ALIASES: Record<string, PropertyCategory> = {
  STUDIO: PropertyCategory.STUDIO,
  STUDIOS: PropertyCategory.STUDIO,
  COLOCATION: PropertyCategory.COLOCATION,
  COLOCATIONS: PropertyCategory.COLOCATION,
  RESIDENCE: PropertyCategory.RESIDENCE,
  RESIDENCES: PropertyCategory.RESIDENCE,
  'RÉSIDENCES': PropertyCategory.RESIDENCE,
  'RÉSIDENCE': PropertyCategory.RESIDENCE,
  CHAMBRE: PropertyCategory.CHAMBRE,
  CHAMBRES: PropertyCategory.CHAMBRE,
};

function mapCategory(raw: unknown): PropertyCategory {
  const key = String(raw || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
  const mapped = CATEGORY_ALIASES[key] || CATEGORY_ALIASES[String(raw || '').trim().toUpperCase()];
  if (!mapped) {
    throw new BadRequestException(`Catégorie invalide: ${raw}. Attendu: Studios, Colocations, Résidences, Chambres`);
  }
  return mapped;
}

function isPersistablePhoto(url: string): boolean {
  const u = url.trim();
  return !!u && !u.startsWith('data:') && !u.startsWith('blob:') && u !== 'null' && u !== 'undefined';
}

function toPhotoList(data: any): string[] {
  const raw = Array.isArray(data.photos)
    ? data.photos
    : Array.isArray(data.images)
      ? data.images
      : data.image
        ? [data.image]
        : [];
  return raw.map(String).filter(isPersistablePhoto);
}

function coordsFromPayload(
  data: any,
  city: string,
  location: string | null,
  title: string,
): { latitude: number | null; longitude: number | null } {
  const lat = parseOptionalCoord(data?.latitude ?? data?.lat);
  const lng = parseOptionalCoord(data?.longitude ?? data?.lng);
  if (lat != null && lng != null) {
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new BadRequestException('Coordonnées GPS invalides');
    }
    return { latitude: lat, longitude: lng };
  }
  const fallback = resolveCoords(city, location, title);
  return fallback
    ? { latitude: fallback.lat, longitude: fallback.lng }
    : { latitude: null, longitude: null };
}

@Injectable()
export class PropertiesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => AgentsService))
    private readonly agents: AgentsService,
  ) {}

  async findMany(query: any) {
    const where: any = {};
    if (query.agentId) where.agentId = Number(query.agentId);
    if (query.city) {
      const city = String(query.city).split(',')[0].trim();
      if (city) where.city = { contains: city, mode: 'insensitive' };
    }
    if (query.category) {
      try {
        where.category = mapCategory(query.category);
      } catch {
        where.category = query.category;
      }
    }
    if (query.furnished !== undefined) where.furnished = Boolean(query.furnished === true || query.furnished === 'true');
    if (query.available !== undefined) where.available = Boolean(query.available !== 'false');
    else if (!query.agentId) where.available = true;
    if (query.minPrice || query.maxPrice) {
      where.price = {};
      if (query.minPrice) where.price.gte = Number(query.minPrice);
      if (query.maxPrice) where.price.lte = Number(query.maxPrice);
    }
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { location: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    const take = Math.min(Number(query.limit || 30), 100);
    const skip = Number(((query.page || 1) - 1) * take);

    const [items, total] = await Promise.all([
      this.prisma.property.findMany({
        where,
        take,
        skip,
        orderBy: { createdAt: 'desc' },
        include: {
          agent: { select: { id: true, agencyName: true, phone: true, avatarUrl: true, verified: true } },
        },
      }),
      this.prisma.property.count({ where }),
    ]);
    return {
      items: items.map((p) => this.toApi(p)),
      meta: { total, page: Number(query.page || 1), perPage: take, totalPages: Math.ceil(total / take) },
    };
  }

  async findById(id: number, viewCtx?: ListingViewContext) {
    const property = await this.prisma.property.findUnique({
      where: { id },
      include: {
        agent: {
          select: {
            id: true,
            agencyName: true,
            phone: true,
            avatarUrl: true,
            verified: true,
            address: true,
            description: true,
            websiteUrl: true,
            createdAt: true,
          },
        },
        _count: { select: { reviews: true } },
      },
    });
    if (!property) throw new NotFoundException('Bien introuvable');

    const isNewView = await this.recordPropertyView(id, viewCtx);
    let viewsCount = property.viewsCount ?? 0;
    if (isNewView) {
      await this.prisma.property.update({ where: { id }, data: { viewsCount: { increment: 1 } } });
      viewsCount += 1;
    }

    return this.toApi({
      ...property,
      viewsCount,
      reviewsCount: property._count?.reviews ?? 0,
    });
  }

  async create(agentId: number, data: any) {
    if (!data?.title?.trim()) throw new BadRequestException('Titre requis');
    if (!data?.city?.trim()) throw new BadRequestException('Ville requise');
    if (data.price == null || Number(data.price) <= 0) throw new BadRequestException('Prix invalide');
    if (data.surface == null || Number(data.surface) <= 0) throw new BadRequestException('Surface invalide');
    if (data.rooms == null || Number(data.rooms) <= 0) throw new BadRequestException('Nombre de pièces invalide');

    const photos = toPhotoList(data);
    const title = String(data.title).trim();
    const city = String(data.city).trim();
    const location = (data.address ?? data.location ?? null)
      ? String(data.address ?? data.location).trim()
      : null;
    const geo = coordsFromPayload(data, city, location, title);
    const created = await this.prisma.property.create({
      data: {
        title,
        description: data.description ? String(data.description).trim() : null,
        price: new Prisma.Decimal(Number(data.price)),
        city,
        location,
        latitude: geo.latitude,
        longitude: geo.longitude,
        category: mapCategory(data.category),
        surface: Number(data.surface),
        rooms: Number(data.rooms),
        bedrooms: data.bedrooms != null ? Number(data.bedrooms) : null,
        bathrooms: data.bathrooms != null ? Number(data.bathrooms) : null,
        furnished: !!data.furnished,
        amenities: Array.isArray(data.amenities) ? data.amenities.map(String) : [],
        photos,
        monthlyRent: new Prisma.Decimal(Number(data.monthlyRent ?? data.price)),
        available: data.available !== false,
        agentId: Number(agentId),
      },
      include: {
        agent: { select: { id: true, agencyName: true, phone: true, avatarUrl: true, verified: true } },
      },
    });

    // Alerte les abonnés (agents / étudiants qui suivent cet agent)
    void this.agents
      .notifyFollowersNewListing({
        agentId: Number(agentId),
        propertyId: created.id,
        title: created.title,
        city: created.city,
      })
      .catch(() => {});

    return this.toApi(created);
  }

  async update(agentId: number, id: number, data: any) {
    const prop = await this.prisma.property.findUnique({ where: { id } });
    assertOwner(prop, 'agentId', Number(agentId), {
      notFound: 'Bien introuvable',
      forbidden: 'Pas autorisé à modifier ce bien',
    });

    const patch: Prisma.PropertyUpdateInput = {};
    if (data.title != null) patch.title = String(data.title).trim();
    if (data.description != null) patch.description = String(data.description).trim();
    if (data.price != null) {
      patch.price = new Prisma.Decimal(Number(data.price));
      patch.monthlyRent = new Prisma.Decimal(Number(data.monthlyRent ?? data.price));
    }
    if (data.city != null) patch.city = String(data.city).trim();
    if (data.address != null || data.location != null) {
      patch.location = String(data.address ?? data.location).trim();
    }
    if (data.category != null) patch.category = mapCategory(data.category);
    if (data.surface != null) patch.surface = Number(data.surface);
    if (data.rooms != null) patch.rooms = Number(data.rooms);
    if (data.furnished != null) patch.furnished = !!data.furnished;
    if (data.amenities != null && Array.isArray(data.amenities)) patch.amenities = data.amenities.map(String);
    if (data.photos != null || data.images != null || data.image != null) {
      patch.photos = toPhotoList(data);
    }
    if (data.available != null) patch.available = !!data.available;

    const nextCity = data.city != null ? String(data.city).trim() : prop.city;
    const nextLoc =
      data.address != null || data.location != null
        ? String(data.address ?? data.location).trim()
        : prop.location;
    const nextTitle = data.title != null ? String(data.title).trim() : prop.title;
    const geoTouched =
      data.latitude != null ||
      data.longitude != null ||
      data.lat != null ||
      data.lng != null ||
      data.city != null ||
      data.address != null ||
      data.location != null ||
      data.title != null;
    if (geoTouched) {
      const geo = coordsFromPayload(data, nextCity, nextLoc, nextTitle);
      patch.latitude = geo.latitude;
      patch.longitude = geo.longitude;
    }

    const updated = await this.prisma.property.update({
      where: { id },
      data: patch,
      include: {
        agent: { select: { id: true, agencyName: true, phone: true, avatarUrl: true, verified: true } },
      },
    });
    return this.toApi(updated);
  }

  async delete(agentId: number, id: number) {
    const prop = await this.prisma.property.findUnique({ where: { id } });
    assertOwner(prop, 'agentId', Number(agentId));
    await this.prisma.property.delete({ where: { id } });
    return { deleted: true, id };
  }

  async toggleFavorite(userId: number, propertyId: number) {
    const fav = await this.prisma.propertyFavorite.findUnique({
      where: { userId_propertyId: { userId, propertyId } },
    });
    if (fav) {
      await this.prisma.propertyFavorite.delete({ where: { userId_propertyId: { userId, propertyId } } });
      return { favorited: false };
    }
    await this.prisma.propertyFavorite.create({ data: { userId, propertyId } });
    return { favorited: true };
  }

  async toggleLike(userId: number, propertyId: number) {
    const property = await this.prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) throw new NotFoundException('Bien introuvable');
    const existing = await this.prisma.propertyLike.findUnique({
      where: { userId_propertyId: { userId, propertyId } },
    });
    if (existing) {
      await this.prisma.propertyLike.delete({ where: { userId_propertyId: { userId, propertyId } } });
      await this.prisma.property.update({
        where: { id: propertyId },
        data: { likesCount: { decrement: 1 } },
      });
      return { liked: false, likesCount: Math.max(0, (property.likesCount ?? 0) - 1) };
    }
    await this.prisma.propertyLike.create({ data: { userId, propertyId } });
    const updated = await this.prisma.property.update({
      where: { id: propertyId },
      data: { likesCount: { increment: 1 } },
    });
    return { liked: true, likesCount: updated.likesCount };
  }

  /** Formate la réponse pour le front (address/images/category labels). */
  private async recordPropertyView(propertyId: number, ctx?: ListingViewContext): Promise<boolean> {
    const user = ctx?.user;
    if (!user?.sub) return false;

    const data: { propertyId: number; userId?: number; agentId?: number } = { propertyId };
    if (user.type === 'agent' || user.role === 'AGENT') {
      data.agentId = user.sub;
    } else {
      data.userId = user.sub;
    }

    try {
      await this.prisma.propertyView.create({ data });
      return true;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') return false;
      throw e;
    }
  }

  private toApi(p: any) {
    const categoryLabel: Record<string, string> = {
      STUDIO: 'Studios',
      COLOCATION: 'Colocations',
      RESIDENCE: 'Résidences',
      CHAMBRE: 'Chambres',
    };
    const photos: string[] = Array.isArray(p.photos) ? p.photos : [];
    let latitude = p.latitude != null ? Number(p.latitude) : null;
    let longitude = p.longitude != null ? Number(p.longitude) : null;
    if (latitude == null || longitude == null || Number.isNaN(latitude) || Number.isNaN(longitude)) {
      const fallback = resolveCoords(p.city, p.location, p.title);
      if (fallback) {
        latitude = fallback.lat;
        longitude = fallback.lng;
      } else {
        latitude = null;
        longitude = null;
      }
    }
    return {
      ...p,
      price: Number(p.price),
      monthlyRent: p.monthlyRent != null ? Number(p.monthlyRent) : Number(p.price),
      depositFee: p.depositFee != null ? Number(p.depositFee) : null,
      address: p.location ?? '',
      location: p.location ?? '',
      latitude,
      longitude,
      images: photos,
      image: photos[0] ?? '',
      category: categoryLabel[p.category] || p.category,
      categoryCode: p.category,
      isReported: !!p.isReported,
    };
  }
}
