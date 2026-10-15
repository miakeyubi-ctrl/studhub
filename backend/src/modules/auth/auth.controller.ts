import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { OtpService } from '../../common/otp/otp.service';
import { EmailService } from '../../common/email/email.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly otp: OtpService,
    private readonly email: EmailService,
  ) {}

  private requireEmail(raw?: string): string {
    const email = String(raw || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException('Adresse e-mail invalide');
    }
    return email;
  }

  private otpError(reason?: string): never {
    throw new BadRequestException(
      reason === 'expired' ? 'Code expiré' :
      reason === 'too_many_attempts' ? 'Trop de tentatives' :
      reason === 'not_found' ? 'Aucun code actif pour cet e-mail' :
      'Code incorrect',
    );
  }

  // =====================================================================
  // OTP Register (e-mail)
  // =====================================================================
  @Post('send-register-otp')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Envoyer un OTP 6 chiffres par e-mail pour inscription' })
  async sendRegisterOtp(@Body() body: { email: string }) {
    const email = this.requireEmail(body.email);
    const r = await this.otp.generate('register', email, 600);
    const delivery = await this.email.sendOtp(email, r.code);
    if (!delivery.delivered) {
      throw new ServiceUnavailableException(
        delivery.error || "Impossible d'envoyer l'e-mail de confirmation",
      );
    }
    // Sans SMTP réel (delivery console) : on renvoie le code pour affichage toast mobile
    const exposeCode =
      delivery.via === 'console' ||
      process.env.NODE_ENV !== 'production' ||
      process.env.OTP_EXPOSE_CODE === 'true';
    return {
      sent: true,
      email,
      purpose: r.purpose,
      expiresInSec: r.expiresInSec,
      storedBy: r.storedBy,
      delivery: delivery.via,
      ...(exposeCode ? { devCode: r.code } : {}),
    };
  }

  @Post('verify-register-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Vérifier un OTP register sans le consommer' })
  async verifyRegisterOtp(@Body() body: { email: string; code: string }) {
    const email = this.requireEmail(body.email);
    const res = await this.otp.verify('register', email, body.code);
    if (!res.valid) this.otpError(res.reason);
    return { valid: true, email };
  }

  // =====================================================================
  // Étudiants
  // =====================================================================
  @Post('student/register')
  @ApiOperation({ summary: 'Créer un compte étudiant (OTP e-mail requis)' })
  registerStudent(@Body() dto: any) {
    return this.auth.registerStudent(dto);
  }

  @Post('student/login')
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Connexion étudiant → accessToken + refreshToken' })
  async loginStudent(@Body() body: { email: string; password: string }, @Res({ passthrough: true }) res: Response) {
    const r = await this.auth.loginStudent(body.email, body.password);
    res.cookie('refreshToken', r.refreshToken, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 7 * 24 * 3600 * 1000,
    });
    return r;
  }

  // =====================================================================
  // Agents
  // =====================================================================
  @Post('agent/register')
  @ApiOperation({ summary: 'Créer un compte agent immobilier (OTP e-mail requis)' })
  registerAgent(@Body() dto: any) {
    return this.auth.registerAgent(dto);
  }

  @Post('agent/login')
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Connexion agent → tokens' })
  async loginAgent(@Body() body: { email: string; password: string }, @Res({ passthrough: true }) res: Response) {
    const r = await this.auth.loginAgent(body.email, body.password);
    res.cookie('refreshToken', r.refreshToken, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 7 * 24 * 3600 * 1000,
    });
    return r;
  }

  // =====================================================================
  // Partenaires (compte email + mot de passe)
  // =====================================================================
  @Post('partner/login')
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Connexion partenaire → tokens' })
  async loginPartner(@Body() body: { email: string; password: string }, @Res({ passthrough: true }) res: Response) {
    const r = await this.auth.loginPartner(body.email, body.password);
    res.cookie('refreshToken', r.refreshToken, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 7 * 24 * 3600 * 1000,
    });
    return r;
  }

  // =====================================================================
  // Refresh / Logout / Me
  // =====================================================================
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Échanger un refresh token contre un nouveau access token' })
  refresh(@Body() body: { refreshToken?: string }) {
    return this.auth.refresh(body.refreshToken || '');
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Déconnexion (supprime cookie refresh)' })
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('refreshToken');
    return null;
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-AUTH')
  @ApiOperation({ summary: 'Récupérer le compte connecté (étudiant ou agent)' })
  me(@CurrentUser() user: JwtPayload) {
    return this.auth.me(user);
  }

  // =====================================================================
  // Mot de passe oublié (OTP e-mail)
  // =====================================================================
  @Post('forgot-password')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Envoyer OTP reset password par e-mail' })
  async forgotPassword(@Body() body: { email: string }) {
    const email = this.requireEmail(body.email);
    const r = await this.otp.generate('reset-password', email, 600);
    const delivery = await this.email.sendOtp(email, r.code);
    if (!delivery.delivered) {
      throw new ServiceUnavailableException(
        delivery.error || "Impossible d'envoyer l'e-mail de réinitialisation",
      );
    }
    const exposeCode =
      delivery.via === 'console' ||
      process.env.NODE_ENV !== 'production' ||
      process.env.OTP_EXPOSE_CODE === 'true';
    return {
      sent: true,
      email,
      expiresInSec: r.expiresInSec,
      storedBy: r.storedBy,
      delivery: delivery.via,
      ...(exposeCode ? { devCode: r.code } : {}),
    };
  }

  @Post('verify-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Vérifier code OTP reset (sans consommer)' })
  async verifyCode(@Body() body: { email: string; code: string }) {
    const email = this.requireEmail(body.email);
    const res = await this.otp.verify('reset-password', email, body.code);
    if (!res.valid) this.otpError(res.reason);
    return { valid: true, email };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Réinitialiser le mot de passe via OTP e-mail' })
  async resetPassword(@Body() body: { email: string; code: string; newPassword: string }) {
    if (!body.newPassword || body.newPassword.length < 8) {
      throw new BadRequestException('Mot de passe trop court (8+ caractères)');
    }
    const email = this.requireEmail(body.email);
    const otpRes = await this.otp.verifyAndConsume('reset-password', email, body.code);
    if (!otpRes.valid) this.otpError(otpRes.reason);

    const bcrypt = await import('bcrypt');
    const saltRounds = Number(process.env.BCRYPT_COST || 12);
    const hash = await bcrypt.hash(body.newPassword, saltRounds);
    const changed = await this.auth.resetAnyPassword(email, hash);
    if (!changed.user && !changed.agent) {
      throw new BadRequestException('Aucun compte trouvé pour cet e-mail');
    }
    return { changed: true, userUpdated: !!changed.user, agentUpdated: !!changed.agent };
  }
}
