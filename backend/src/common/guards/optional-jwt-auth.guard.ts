import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { JwtPayload } from '../decorators/current-user.decorator';

/** Valide le JWT si présent, sans bloquer les requêtes publiques. */
@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(req) ?? this.extractTokenFromCookie(req);
    if (!token) return true;

    try {
      const payload = (await this.jwt.verifyAsync(token, {
        secret: this.config.get('JWT_ACCESS_SECRET'),
        issuer: this.config.get('JWT_ISSUER', 'studhub.tn'),
        audience: this.config.get('JWT_AUDIENCE', 'studhub-api'),
      })) as JwtPayload;
      if (payload?.sub && payload?.role) {
        (req as any).user = payload;
      }
    } catch {
      // Token invalide sur route publique : ignorer
    }
    return true;
  }

  private extractTokenFromHeader(req: Request): string | undefined {
    const [type, token] = req.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  private extractTokenFromCookie(req: Request): string | undefined {
    return (req.cookies?.accessToken as string) || undefined;
  }
}
