import { Injectable, BadRequestException, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Role } from '@prisma/client';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import { OtpService } from '../../common/otp/otp.service';
import { normalizeTunisianPhone, isValidE164Phone } from '../../common/phone/phone.util';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly cfg: ConfigService,
    private readonly otp: OtpService,
  ) {}

  private cost() {
    return Number(this.cfg.get('BCRYPT_COST', 12));
  }

  private requirePhone(raw?: string): string {
    const phone = normalizeTunisianPhone(raw || '');
    if (!phone || !isValidE164Phone(phone)) {
      throw new BadRequestException('Numéro de téléphone invalide');
    }
    return phone;
  }

  private requireEmail(raw?: string): string {
    const email = String(raw || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException('Adresse e-mail invalide');
    }
    return email;
  }

  private optionalPhone(raw?: string): string | undefined {
    const trimmed = String(raw || '').trim();
    if (!trimmed) return undefined;
    return this.requirePhone(trimmed);
  }

  async registerStudent(dto: any) {
    const normalizedEmail = this.requireEmail(dto.email);
    const firstName = String(dto.firstName || '').trim();
    const lastName = String(dto.lastName || '').trim();
    const fullName = String(dto.fullName || `${firstName} ${lastName}`).trim().replace(/\s+/g, ' ');
    if (fullName.length < 2) throw new BadRequestException('Nom et prénom requis');

    const nationality = String(dto.nationality || '').trim();
    if (!nationality) throw new BadRequestException('Nationalité requise');

    const city = String(dto.city || '').trim();
    if (!city) throw new BadRequestException('Ville de résidence requise');

    const university = String(dto.university || '').trim();
    if (!university) throw new BadRequestException('Université ou établissement requis');

    if (!dto.acceptTerms) throw new BadRequestException('Acceptation des conditions requise');

    const plainPassword = typeof dto.password === 'string' ? dto.password : '';
    if (plainPassword.length < 6) {
      throw new BadRequestException('Le mot de passe doit contenir au moins 6 caractères');
    }
    if (dto.confirmPassword !== undefined && String(dto.confirmPassword) !== plainPassword) {
      throw new BadRequestException('Les mots de passe ne correspondent pas');
    }

    const otpOk = await this.validateRegisterOtpOrThrow(normalizedEmail, dto.otpCode);

    const exists = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (exists) throw new ConflictException('Cet email est déjà utilisé');

    const phone = this.requirePhone(dto.phone);
    const phoneTaken = await this.prisma.user.findFirst({
      where: { OR: [{ phone }, { phone: phone.replace('+216', '') }, { phone: phone.replace('+216', '0') }] },
      select: { id: true },
    });
    if (phoneTaken) throw new ConflictException('Ce numéro est déjà utilisé');

    const hash = await bcrypt.hash(plainPassword, this.cost());
    const user = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash: hash,
        fullName,
        phone,
        nationality,
        city,
        university,
        studyLevel: dto.studyLevel,
        avatarUrl: typeof dto.avatarUrl === 'string' ? dto.avatarUrl.trim() : undefined,
        role: Role.STUDENT,
        emailVerifiedAt: otpOk ? new Date() : null,
        termsAcceptedAt: new Date(),
      },
      select: {
        id: true, email: true, fullName: true, phone: true, nationality: true, city: true,
        university: true, studyLevel: true, role: true, avatarUrl: true,
        createdAt: true, emailVerifiedAt: true, termsAcceptedAt: true,
      },
    });
    const tokens = await this.signTokens({ sub: user.id, email: user.email, role: Role.STUDENT, type: 'user' });
    return { user, ...tokens };
  }

  async loginStudent(email: string, password: string) {
    const u = await this.prisma.user.findUnique({ where: { email } });
    if (!u) throw new UnauthorizedException('Email ou mot de passe incorrect');
    const ok = await bcrypt.compare(password, u.passwordHash);
    if (!ok) throw new UnauthorizedException('Email ou mot de passe incorrect');
    if (u.blockedAt) throw new UnauthorizedException('Compte bloqué par un administrateur');
    const user = {
      id: u.id, email: u.email, fullName: u.fullName, phone: u.phone,
      nationality: u.nationality, city: u.city,
      university: u.university, studyLevel: u.studyLevel, role: u.role, avatarUrl: u.avatarUrl,
      createdAt: u.createdAt, updatedAt: u.updatedAt, blockedAt: u.blockedAt,
    };
    // Rôle réel (STUDENT ou ADMIN) : un admin se connecte via le login étudiant
    const tokens = await this.signTokens({ sub: u.id, email: u.email, role: u.role, type: 'user' });
    return { user, ...tokens };
  }

  async registerAgent(dto: any) {
    const normalizedEmail = this.requireEmail(dto.email);
    const phone = this.requirePhone(dto.phone);

    const firstName = String(dto.firstName || '').trim();
    const lastName = String(dto.lastName || '').trim();
    const fullNameFallback = String(dto.fullName || '').trim();
    let resolvedFirst = firstName;
    let resolvedLast = lastName;
    if ((!resolvedFirst || !resolvedLast) && fullNameFallback) {
      const parts = fullNameFallback.split(/\s+/);
      resolvedFirst = resolvedFirst || parts[0] || '';
      resolvedLast = resolvedLast || parts.slice(1).join(' ') || parts[0] || '';
    }
    if (resolvedFirst.length < 2 || resolvedLast.length < 2) {
      throw new BadRequestException('Nom et prénom requis');
    }

    const activityTypeRaw = String(dto.activityType || '').trim().toUpperCase();
    const allowedTypes = ['AGENT_IMMOBILIER', 'PROPRIETAIRE', 'TRANSPORT', 'MENAGE', 'AUTRE_SERVICE'] as const;
    if (!allowedTypes.includes(activityTypeRaw as (typeof allowedTypes)[number])) {
      throw new BadRequestException('Type d\'activité requis');
    }
    const activityType = activityTypeRaw as
      | 'AGENT_IMMOBILIER'
      | 'PROPRIETAIRE'
      | 'TRANSPORT'
      | 'MENAGE'
      | 'AUTRE_SERVICE';

    const activityCity = String(dto.activityCity || dto.city || '').trim();
    if (!activityCity) throw new BadRequestException('Ville ou zone d\'activité requise');

    const agencyName = String(dto.agencyName || '').trim() || null;
    if (activityType === 'AGENT_IMMOBILIER' && !agencyName) {
      throw new BadRequestException('Nom de l\'entreprise requis pour un agent immobilier');
    }

    if (!dto.acceptTerms) throw new BadRequestException('Acceptation des conditions requise');

    const plainPassword = typeof dto.password === 'string' ? dto.password : '';
    if (plainPassword.length < 6) {
      throw new BadRequestException('Le mot de passe doit contenir au moins 6 caractères');
    }
    if (dto.confirmPassword !== undefined && String(dto.confirmPassword) !== plainPassword) {
      throw new BadRequestException('Les mots de passe ne correspondent pas');
    }

    const otpOk = await this.validateRegisterOtpOrThrow(normalizedEmail, dto.otpCode);

    const exists = await this.prisma.agent.findUnique({ where: { email: normalizedEmail } });
    if (exists) throw new ConflictException('Cet email agent est déjà utilisé');
    const hash = await bcrypt.hash(plainPassword, this.cost());
    const agent = await this.prisma.agent.create({
      data: {
        email: normalizedEmail,
        passwordHash: hash,
        firstName: resolvedFirst,
        lastName: resolvedLast,
        agencyName,
        phone,
        activityType,
        activityCity,
        address: dto.address,
        licenseNumber: dto.licenseNumber,
        description: dto.description,
        role: Role.AGENT,
        emailVerifiedAt: otpOk ? new Date() : null,
        termsAcceptedAt: new Date(),
        verified: otpOk ? true : false,
      },
      select: {
        id: true, email: true, firstName: true, lastName: true, agencyName: true,
        phone: true, activityType: true, activityCity: true, address: true, verified: true,
        tier: true, avatarUrl: true, createdAt: true, role: true, emailVerifiedAt: true,
        termsAcceptedAt: true,
      },
    });
    const tokens = await this.signTokens({ sub: agent.id, email: agent.email, role: Role.AGENT, type: 'agent' });
    return { agent, ...tokens };
  }

  async loginAgent(email: string, password: string) {
    const a = await this.prisma.agent.findUnique({ where: { email } });
    if (!a) throw new UnauthorizedException('Email ou mot de passe incorrect');
    const ok = await bcrypt.compare(password, a.passwordHash);
    if (!ok) throw new UnauthorizedException('Email ou mot de passe incorrect');
    if (a.blockedAt) throw new UnauthorizedException('Compte bloqué par un administrateur');
    const agent = {
      id: a.id, email: a.email, firstName: a.firstName, lastName: a.lastName,
      agencyName: a.agencyName, phone: a.phone, activityType: a.activityType, activityCity: a.activityCity,
      address: a.address, verified: a.verified, tier: a.tier, avatarUrl: a.avatarUrl, role: a.role,
      createdAt: a.createdAt, updatedAt: a.updatedAt, blockedAt: a.blockedAt,
    };
    const tokens = await this.signTokens({ sub: a.id, email: a.email, role: Role.AGENT, type: 'agent' });
    return { agent, ...tokens };
  }

  async loginPartner(email: string, password: string) {
    const loginEmail = String(email || '').trim().toLowerCase();
    const p = await this.prisma.partner.findUnique({ where: { loginEmail } });
    if (!p || !p.passwordHash) throw new UnauthorizedException('Email ou mot de passe incorrect');
    if (!p.isActive) throw new UnauthorizedException('Compte partenaire désactivé');
    const ok = await bcrypt.compare(password, p.passwordHash);
    if (!ok) throw new UnauthorizedException('Email ou mot de passe incorrect');
    const partner = {
      id: p.id,
      email: p.loginEmail,
      name: p.name,
      logoUrl: p.logoUrl,
      category: p.category,
      viewsCount: p.viewsCount,
      likesCount: p.likesCount,
      clicksCount: p.clicksCount,
      role: Role.PARTNER,
    };
    const tokens = await this.signTokens({
      sub: p.id,
      email: p.loginEmail!,
      role: Role.PARTNER,
      type: 'partner',
    });
    return { partner, ...tokens };
  }

  async refresh(refreshToken: string) {
    if (!refreshToken) throw new UnauthorizedException('Refresh token manquant');
    try {
      const payload = await this.jwt.verifyAsync(refreshToken, { secret: this.cfg.get('JWT_REFRESH_SECRET') });
      return this.signTokens({ sub: payload.sub, email: payload.email, role: payload.role, type: payload.type });
    } catch {
      throw new UnauthorizedException('Refresh token invalide');
    }
  }

  async me(payload: JwtPayload) {
    if (payload.type === 'agent') {
      const agent = await this.prisma.agent.findUnique({
        where: { id: payload.sub },
        select: {
          id: true, email: true, firstName: true, lastName: true, agencyName: true,
          phone: true, activityType: true, activityCity: true, address: true,
          websiteUrl: true, description: true,
          verified: true, tier: true, avatarUrl: true, role: true,
          createdAt: true, updatedAt: true, blockedAt: true,
        },
      });
      if (agent?.blockedAt) throw new UnauthorizedException('Compte bloqué par un administrateur');
      return agent;
    }
    if (payload.type === 'partner') {
      const p = await this.prisma.partner.findUnique({
        where: { id: payload.sub },
        select: {
          id: true, loginEmail: true, name: true, logoUrl: true, category: true,
          offer: true, city: true, isActive: true, viewsCount: true, likesCount: true,
          clicksCount: true, createdAt: true,
        },
      });
      if (!p) return null;
      return { ...p, email: p.loginEmail, role: Role.PARTNER };
    }
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true, email: true, fullName: true, phone: true, nationality: true, city: true,
        university: true, studyLevel: true, bio: true, role: true, avatarUrl: true,
        createdAt: true, updatedAt: true, blockedAt: true,
      },
    });
    if (user?.blockedAt) throw new UnauthorizedException('Compte bloqué par un administrateur');
    return user;
  }

  private async validateRegisterOtpOrThrow(email: string, otpCode?: string | null): Promise<boolean> {
    const code = typeof otpCode === 'string' ? otpCode.trim() : '';
    const isDev = process.env.NODE_ENV !== 'production';
    if (isDev && code === '000000') return true;

    if (!code) throw new BadRequestException('Code de vérification (OTP) requis');
    if (!/^\d{6}$/.test(code)) throw new BadRequestException('Code OTP invalide (6 chiffres attendus)');

    const res = await this.otp.verifyAndConsume('register', email, code);
    if (res.valid) return true;
    const mapReason: Record<string, string> = {
      invalid: 'Code OTP incorrect',
      expired: 'Code OTP expiré (demandez-en un nouveau)',
      too_many_attempts: 'Trop de tentatives (demandez un nouveau code)',
      not_found: 'Aucun code OTP actif pour cet e-mail (demandez-en un nouveau)',
    };
    throw new BadRequestException(mapReason[res.reason || 'invalid'] || 'Code OTP invalide');
  }

  async resetAnyPasswordByPhone(
    phoneE164: string,
    passwordHash: string,
  ): Promise<{ user?: { id: number }; agent?: { id: number } }> {
    const phone = this.requirePhone(phoneE164);
    const variants = [phone, phone.replace('+216', ''), phone.replace('+216', '0')];

    const u = await this.prisma.user.findFirst({
      where: { OR: variants.map((p) => ({ phone: p })) },
      select: { id: true },
    });
    if (u) {
      await this.prisma.user.update({ where: { id: u.id }, data: { passwordHash, phone } });
      return { user: u };
    }

    const a = await this.prisma.agent.findFirst({
      where: { OR: variants.map((p) => ({ phone: p })) },
      select: { id: true },
    });
    if (a) {
      await this.prisma.agent.update({ where: { id: a.id }, data: { passwordHash, phone } });
      return { agent: a };
    }
    return {};
  }

  async resetAnyPassword(
    normalizedEmail: string,
    passwordHash: string,
  ): Promise<{ user?: { id: number | string }; agent?: { id: number | string } }> {
    const email = normalizedEmail.trim().toLowerCase();
    const u = await this.prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (u) {
      await this.prisma.user.update({ where: { id: u.id }, data: { passwordHash } });
      return { user: u };
    }
    const a = await this.prisma.agent.findUnique({ where: { email }, select: { id: true } });
    if (a) {
      await this.prisma.agent.update({ where: { id: a.id }, data: { passwordHash } });
      return { agent: a };
    }
    return {};
  }

  private async signTokens(payload: Omit<JwtPayload, 'iat' | 'exp'>) {
    const accessToken = await this.jwt.signAsync(payload as object, {
      secret: this.cfg.get('JWT_ACCESS_SECRET'),
      expiresIn: this.cfg.get('JWT_ACCESS_TTL', '15m'),
      issuer: this.cfg.get('JWT_ISSUER'),
      audience: this.cfg.get('JWT_AUDIENCE'),
    });
    const refreshToken = await this.jwt.signAsync(payload as object, {
      secret: this.cfg.get('JWT_REFRESH_SECRET'),
      expiresIn: this.cfg.get('JWT_REFRESH_TTL', '7d'),
    });
    return { accessToken, refreshToken };
  }
}
