import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Récupère l'utilisateur / agent connecté depuis la requête
 * (injecté par JwtAuthGuard après validation du token)
 *
 * Usage: @CurrentUser() user: JwtPayload
 */
export interface JwtPayload {
  sub: number;
  email: string;
  role: 'STUDENT' | 'AGENT' | 'ADMIN' | 'PARTNER';
  type: 'user' | 'agent' | 'partner';
  iat?: number;
  exp?: number;
}

export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const payload = request.user as JwtPayload | undefined;
    if (!payload) return null;
    return data ? payload[data] : payload;
  },
);
