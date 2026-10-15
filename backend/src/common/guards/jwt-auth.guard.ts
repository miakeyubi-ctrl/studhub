import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { JwtPayload } from '../decorators/current-user.decorator';

/**
 * Garde JWT "maison" (plus simple que Passport pour StudHub).
 * Valide Bearer Token dans l'header Authorization et attache le payload à req.user.
 * Gère aussi refresh token via cookie `refreshToken` (optionnel).
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(req) ?? this.extractTokenFromCookie(req);
    if (!token) throw new UnauthorizedException('Token manquant');

    try {
      const payload = (await this.jwt.verifyAsync(token, {
        secret: this.config.get('JWT_ACCESS_SECRET'),
        issuer: this.config.get('JWT_ISSUER', 'studhub.tn'),
        audience: this.config.get('JWT_AUDIENCE', 'studhub-api'),
      })) as JwtPayload;
      if (!payload?.sub || !payload?.role) {
        throw new UnauthorizedException('Token invalide');
      }
      (req as any).user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Token invalide ou expiré');
    }
  }

  private extractTokenFromHeader(req: Request): string | undefined {
    const [type, token] = req.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
  private extractTokenFromCookie(req: Request): string | undefined {
    return (req.cookies?.accessToken as string) || undefined;
  }
}
