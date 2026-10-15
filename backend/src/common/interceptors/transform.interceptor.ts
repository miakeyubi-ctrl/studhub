import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

/**
 * Intercepteur global : transforme TOUTES les réponses API en format uniforme :
 * { success: true, data: T, message?: string, meta?: any }
 *
 * Si le handler retourne déjà un objet { data, message, meta }, on le laisse passer.
 */
@Injectable()
export class TransformInterceptor<T, R> implements NestInterceptor<T, R> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    return next.handle().pipe(
      map((value) => {
        // Routes spéciales (favicon, swagger UI) : on renvoie tel quel
        const url = request.url || '';
        if (url.startsWith('/docs') || url.startsWith('/uploads')) return value;

        // Si le contrôleur a déjà construit la réponse standard, ne rien faire
        if (
          value &&
          typeof value === 'object' &&
          'success' in value &&
          'data' in value
        ) {
          return value;
        }

        return {
          success: true,
          statusCode: context.switchToHttp().getResponse().statusCode || 200,
          data: value ?? null,
          message: value === null || value === undefined ? 'Pas de données' : undefined,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
