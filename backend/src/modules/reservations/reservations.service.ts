import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ReservationStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

const STATUS_TO_FRONT: Record<ReservationStatus, 'attente' | 'confirmee' | 'terminee'> = {
  PENDING: 'attente',
  CONFIRMED: 'confirmee',
  COMPLETED: 'terminee',
  CANCELLED: 'terminee',
};

@Injectable()
export class ReservationsService {
  constructor(private readonly prisma: PrismaService) {}

  async mine(userId: number) {
    const rows = await this.prisma.propertyReservation.findMany({
      where: { userId, status: { not: ReservationStatus.CANCELLED } },
      orderBy: { createdAt: 'desc' },
      include: {
        property: { select: { title: true, city: true, price: true, photos: true } },
      },
    });
    return rows.map((row) => this.toFront(row));
  }

  async create(userId: number, propertyId: number) {
    if (!propertyId) throw new BadRequestException('Logement requis');
    const property = await this.prisma.property.findUnique({ where: { id: propertyId } });
    if (!property || !property.available) throw new NotFoundException('Logement introuvable');

    const existing = await this.prisma.propertyReservation.findFirst({
      where: { userId, propertyId, status: { not: ReservationStatus.CANCELLED } },
      include: {
        property: { select: { title: true, city: true, price: true, photos: true } },
      },
    });
    if (existing) return this.toFront(existing);

    const created = await this.prisma.propertyReservation.create({
      data: {
        userId,
        propertyId,
        startDate: new Date(),
        status: ReservationStatus.PENDING,
      },
      include: {
        property: { select: { title: true, city: true, price: true, photos: true } },
      },
    });
    return this.toFront(created);
  }

  private toFront(row: {
    id: number;
    startDate: Date | null;
    endDate: Date | null;
    status: ReservationStatus;
    property: { title: string; city: string; price: { toString(): string }; photos: string[] };
  }) {
    return {
      id: row.id,
      title: row.property.title,
      city: row.property.city,
      image: row.property.photos[0] || '',
      dateDebut: row.startDate ? row.startDate.toISOString().slice(0, 10) : '',
      dateFin: row.endDate ? row.endDate.toISOString().slice(0, 10) : '',
      price: Number(row.property.price),
      status: STATUS_TO_FRONT[row.status],
    };
  }
}
