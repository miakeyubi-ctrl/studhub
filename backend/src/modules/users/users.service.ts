import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../common/prisma/prisma.service';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import { UNIVERSITIES, matchUniversityId } from './universities';

const USER_PUBLIC_SELECT = {
  id: true,
  email: true,
  fullName: true,
  phone: true,
  nationality: true,
  city: true,
  university: true,
  studyLevel: true,
  role: true,
  avatarUrl: true,
  bio: true,
  createdAt: true,
  updatedAt: true,
  blockedAt: true,
} as const;

const ADMIN_USER_SELECT = {
  ...USER_PUBLIC_SELECT,
  emailVerifiedAt: true,
} as const;

const ADMIN_AGENT_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  agencyName: true,
  phone: true,
  activityType: true,
  activityCity: true,
  address: true,
  avatarUrl: true,
  verified: true,
  tier: true,
  role: true,
  createdAt: true,
  updatedAt: true,
  blockedAt: true,
  emailVerifiedAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findMany(args: any) {
    return this.prisma.user.findMany(args);
  }

  findById(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        university: true,
        studyLevel: true,
        role: true,
        avatarUrl: true,
        bio: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  listUniversities() {
    return UNIVERSITIES.map(({ id, name, short }) => ({ id, name, short }));
  }

  async universityStats() {
    const rows = await this.prisma.user.groupBy({
      by: ['university'],
      where: {
        role: Role.STUDENT,
        university: { not: null },
      },
      _count: { _all: true },
    });

    const counts = new Map<string, number>();
    for (const row of rows) {
      const id = matchUniversityId(row.university);
      if (!id) continue;
      counts.set(id, (counts.get(id) || 0) + row._count._all);
    }

    return UNIVERSITIES.map((u) => ({
      id: u.id,
      name: u.name,
      short: u.short,
      studentsCount: counts.get(u.id) || 0,
    }));
  }

  async updateProfile(
    requester: JwtPayload,
    userId: number,
    body: {
      fullName?: string;
      phone?: string;
      nationality?: string;
      city?: string;
      university?: string;
      studyLevel?: string;
      bio?: string;
      avatarUrl?: string;
    },
  ) {
    if (requester.type !== 'user' || requester.sub !== userId) {
      throw new ForbiddenException('Vous ne pouvez modifier que votre propre profil');
    }

    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, blockedAt: true },
    });
    if (!existing) throw new NotFoundException('Utilisateur introuvable');
    if (existing.blockedAt) {
      throw new ForbiddenException('Compte bloqué');
    }

    const data: Record<string, string> = {};
    if (typeof body.fullName === 'string') {
      const fullName = body.fullName.trim();
      if (fullName.length < 2) throw new BadRequestException('Nom trop court');
      data.fullName = fullName;
    }
    if (typeof body.phone === 'string') data.phone = body.phone.trim();
    if (typeof body.nationality === 'string') data.nationality = body.nationality.trim();
    if (typeof body.city === 'string') data.city = body.city.trim();
    if (typeof body.university === 'string') data.university = body.university.trim();
    if (typeof body.studyLevel === 'string') data.studyLevel = body.studyLevel.trim();
    if (typeof body.bio === 'string') data.bio = body.bio.trim();
    if (typeof body.avatarUrl === 'string') data.avatarUrl = body.avatarUrl.trim();

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('Aucun champ à mettre à jour');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: USER_PUBLIC_SELECT,
    });
  }

  /** Liste admin : étudiants + admins (+ agents en option via kind). */
  async adminListAccounts(params?: { search?: string; kind?: 'user' | 'agent' | 'all' }) {
    const q = (params?.search || '').trim();
    const kind = params?.kind || 'all';

    const userWhere: any = {};
    const agentWhere: any = {};
    if (q) {
      userWhere.OR = [
        { email: { contains: q, mode: 'insensitive' } },
        { fullName: { contains: q, mode: 'insensitive' } },
        { university: { contains: q, mode: 'insensitive' } },
      ];
      agentWhere.OR = [
        { email: { contains: q, mode: 'insensitive' } },
        { agencyName: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [users, agents] = await Promise.all([
      kind === 'agent'
        ? Promise.resolve([])
        : this.prisma.user.findMany({
            where: userWhere,
            select: ADMIN_USER_SELECT,
            orderBy: { createdAt: 'desc' },
            take: 500,
          }),
      kind === 'user'
        ? Promise.resolve([])
        : this.prisma.agent.findMany({
            where: agentWhere,
            select: ADMIN_AGENT_SELECT,
            orderBy: { createdAt: 'desc' },
            take: 500,
          }),
    ]);

    const mappedUsers = users.map((u) => ({
      kind: 'user' as const,
      id: u.id,
      email: u.email,
      displayName: u.fullName,
      phone: u.phone,
      university: u.university,
      role: u.role,
      avatarUrl: u.avatarUrl,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      blockedAt: u.blockedAt,
      isBlocked: !!u.blockedAt,
    }));

    const mappedAgents = agents.map((a) => ({
      kind: 'agent' as const,
      id: a.id,
      email: a.email,
      displayName:
        a.agencyName ||
        `${a.firstName || ''} ${a.lastName || ''}`.trim() ||
        a.email,
      phone: a.phone,
      university: null as string | null,
      role: a.role,
      avatarUrl: a.avatarUrl,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
      blockedAt: a.blockedAt,
      isBlocked: !!a.blockedAt,
    }));

    return [...mappedUsers, ...mappedAgents].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  /** Suppression définitive du compte étudiant (mot de passe requis). */
  async deleteOwnAccount(requester: JwtPayload, password: string) {
    if (requester.type !== 'user') {
      throw new ForbiddenException('Seuls les comptes étudiants peuvent être supprimés ici');
    }
    const plain = String(password || '');
    if (plain.length < 6) {
      throw new BadRequestException('Mot de passe requis');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: requester.sub },
      select: { id: true, email: true, role: true, passwordHash: true },
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    if (user.role === Role.ADMIN) {
      throw new ForbiddenException('Impossible de supprimer un compte administrateur');
    }

    const ok = await bcrypt.compare(plain, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Mot de passe incorrect');

    await this.prisma.user.delete({ where: { id: user.id } });
    return { success: true, message: 'Compte supprimé' };
  }

  async adminSetBlocked(
    requester: JwtPayload,
    kind: 'user' | 'agent',
    id: number,
    blocked: boolean,
  ) {
    if (kind === 'user') {
      const target = await this.prisma.user.findUnique({
        where: { id },
        select: { id: true, role: true, email: true },
      });
      if (!target) throw new NotFoundException('Utilisateur introuvable');
      if (target.role === Role.ADMIN) {
        throw new ForbiddenException('Impossible de bloquer un administrateur');
      }
      if (requester.type === 'user' && requester.sub === id) {
        throw new ForbiddenException('Vous ne pouvez pas bloquer votre propre compte');
      }
      return this.prisma.user.update({
        where: { id },
        data: { blockedAt: blocked ? new Date() : null },
        select: ADMIN_USER_SELECT,
      });
    }

    const target = await this.prisma.agent.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!target) throw new NotFoundException('Agent introuvable');
    return this.prisma.agent.update({
      where: { id },
      data: { blockedAt: blocked ? new Date() : null },
      select: ADMIN_AGENT_SELECT,
    });
  }
}
