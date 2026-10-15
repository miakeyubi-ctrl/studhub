import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse,
  HTTP_INTERCEPTORS,
} from '@angular/common/http';
import { Observable, throwError, BehaviorSubject, of } from 'rxjs';
import { catchError, filter, take, switchMap, first, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from '../services/auth.service';
import { AgentAuthService } from '../services/agent-auth.service';
import { PartnerAuthService } from '../services/partner-auth.service';
import { ActiveRoleService } from '../services/active-role.service';
import { Router } from '@angular/router';

/**
 * Intercepteur JWT StudHub.
 *  1. Ajoute `Authorization: Bearer <accessToken>` sur les requêtes vers API_URL.
 *  2. Sur erreur 401 :
 *     - Si c'est la requête /auth/refresh ou /auth/login → ne pas refresh (boucle infinie).
 *     - Sinon : exécute 1 SEUL refresh en parallèle (via `isRefreshing` + queue).
 *       - Si refresh OK → relance la requête initiale avec nouveau token.
 *       - Si refresh KO → logout propre + redirect login.
 *  3. AvecCredentials sur routes /auth (cookies refresh HttpOnly si configurés).
 */
@Injectable()
export class JwtInterceptor implements HttpInterceptor {

  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<boolean | null> = new BehaviorSubject<boolean | null>(null);

  constructor(
    private authService: AuthService,
    private agentAuthService: AgentAuthService,
    private partnerAuthService: PartnerAuthService,
    private activeRole: ActiveRoleService,
    private router: Router,
  ) {}

  private preferAgent(): boolean {
    if (this.activeRole.preferAgent()) return true;
    const url = this.router.url || '';
    return url.includes('/agent-dashboard') || url.includes('/agent-login');
  }

  private preferPartner(): boolean {
    if (this.activeRole.preferPartner()) return true;
    const url = this.router.url || '';
    return url.includes('/partner-dashboard') || url.includes('/partner-login');
  }

  private pickAccessToken(): string | null {
    const studentToken = this.authService.getAccessToken();
    const agentToken = this.agentAuthService.getAccessToken();
    const partnerToken = this.partnerAuthService.getAccessToken();
    if (this.preferPartner()) return partnerToken || studentToken || agentToken;
    if (this.preferAgent()) return agentToken || studentToken || partnerToken;
    return studentToken || agentToken || partnerToken;
  }

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // N'ajoute le Bearer que sur les requêtes vers NOTRE API (pas vers les assets, i18n, etc.)
    const isApiRequest = request.url.startsWith(environment.apiUrl);
    if (!isApiRequest) return next.handle(request);

    const isAuthPath = request.url.includes('/auth/');
    const isRefreshEndpoint = isAuthPath && request.url.endsWith('/auth/refresh');

    // Ajoute withCredentials sur les routes auth (pour cookies refresh HttpOnly si support navigateur)
    if (isAuthPath) {
      request = request.clone({ withCredentials: true });
    }

    // Token selon l'espace actif (agent → agent, sinon étudiant)
    const token = this.pickAccessToken();

    if (token && !request.headers.has('Authorization')) {
      request = request.clone({
        setHeaders: { Authorization: `Bearer ${token}` },
      });
    }

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          // Sur le endpoint refresh lui-même, ou login → logout direct
          if (
            isRefreshEndpoint ||
            request.url.endsWith('/auth/login') ||
            request.url.endsWith('/auth/student/login') ||
            request.url.endsWith('/auth/agent/login') ||
            request.url.endsWith('/auth/partner/login')
          ) {
            this.logoutAll();
            return throwError(() => error);
          }
          // Fichiers / upload 401 souvent liés au token expiré, même logique
          return this.handle401Error(request, next, error);
        }
        return throwError(() => error);
      }),
    );
  }

  private logoutAll(): void {
    try { this.authService.logout(); } catch {}
    try { this.agentAuthService.logout(); } catch {}
    try { this.partnerAuthService.logout(); } catch {}
    // Ne pas arracher l'utilisateur d'un flux d'inscription / login
    const url = this.router.url || '';
    const onGuestAuth =
      url.startsWith('/register') ||
      url.startsWith('/agent-register') ||
      url.startsWith('/login') ||
      url.startsWith('/agent-login') ||
      url.startsWith('/partner-login') ||
      url.startsWith('/forgot-password') ||
      url.startsWith('/verify-code') ||
      url.startsWith('/reset-password') ||
      url.startsWith('/onbroading');
    if (!onGuestAuth) {
      try { this.router.navigate(['/login']).catch(() => {}); } catch {}
    }
  }

  private pickRefreshPromise(): Promise<boolean> {
    if (this.preferPartner() && this.partnerAuthService.getRefreshToken()) {
      return this.partnerAuthService.refreshAccessToken();
    }
    if (this.preferAgent() && this.agentAuthService.getRefreshToken()) {
      return this.agentAuthService.refreshAccessToken();
    }
    if (this.authService.getRefreshToken()) return this.authService.refreshAccessToken();
    if (this.agentAuthService.getRefreshToken()) return this.agentAuthService.refreshAccessToken();
    if (this.partnerAuthService.getRefreshToken()) return this.partnerAuthService.refreshAccessToken();
    return Promise.resolve(false);
  }

  /**
   * Gère un 401 : tente un refresh token UNIQUE (toutes les requêtes 401 en parallèle attendent).
   */
  private handle401Error(
    request: HttpRequest<unknown>,
    next: HttpHandler,
    originalError: HttpErrorResponse,
  ): Observable<HttpEvent<unknown>> {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      const refreshPromise = this.pickRefreshPromise();

      return fromPromise(refreshPromise).pipe(
        first(),
        tap((refreshedOk: boolean) => {
          this.isRefreshing = false;
          this.refreshTokenSubject.next(refreshedOk);
        }),
        switchMap((refreshedOk: boolean) => {
          if (!refreshedOk) {
            this.logoutAll();
            return throwError(() => originalError);
          }
          const newToken = this.pickAccessToken();
          if (!newToken) {
            this.logoutAll();
            return throwError(() => originalError);
          }
          const cloned = request.clone({
            setHeaders: { Authorization: `Bearer ${newToken}` },
          });
          return next.handle(cloned);
        }),
        catchError((err) => {
          this.isRefreshing = false;
          this.refreshTokenSubject.next(false);
          this.logoutAll();
          return throwError(() => err);
        }),
      );
    }

    // Déjà en cours de refresh : attendre le résultat sur le BehaviorSubject puis relancer
    return this.refreshTokenSubject.pipe(
      filter((result): result is boolean => result !== null),
      take(1),
      switchMap((refreshedOk: boolean) => {
        if (!refreshedOk) {
          this.logoutAll();
          return throwError(() => originalError);
        }
        const newToken = this.pickAccessToken();
        if (!newToken) {
          this.logoutAll();
          return throwError(() => originalError);
        }
        const cloned = request.clone({
          setHeaders: { Authorization: `Bearer ${newToken}` },
        });
        return next.handle(cloned);
      }),
    );
  }
}

/**
 * Convertit une Promise<T> en Observable<T> (évite d'importer from depuis rxjs pour ne pas casser imports).
 */
function fromPromise<T>(promise: Promise<T>): Observable<T> {
  return new Observable<T>(obs => {
    let cancelled = false;
    Promise.resolve(promise).then(v => {
      if (!cancelled) { obs.next(v); obs.complete(); }
    }).catch(err => {
      if (!cancelled) obs.error(err);
    });
    return () => { cancelled = true; };
  });
}

export const JwtInterceptorProvider = {
  provide: HTTP_INTERCEPTORS,
  useClass: JwtInterceptor,
  multi: true,
};
