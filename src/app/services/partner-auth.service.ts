import { Injectable } from '@angular/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface PartnerAccount {
  id: string;
  name: string;
  email: string;
  logoUrl?: string;
  category?: string;
  viewsCount?: number;
  likesCount?: number;
  clicksCount?: number;
  role?: string;
}

interface ActionResult {
  success: boolean;
  message?: string;
}

interface BackendPartnerUser {
  id: number | string;
  email?: string;
  loginEmail?: string;
  name?: string;
  logoUrl?: string;
  category?: string;
  viewsCount?: number;
  likesCount?: number;
  clicksCount?: number;
  role?: string;
}

interface BackendPartnerFlatLogin {
  partner: BackendPartnerUser;
  accessToken: string;
  refreshToken?: string;
}

interface BackendPartnerWrappedLogin {
  success: boolean;
  data: {
    accessToken: string;
    refreshToken?: string;
    partner?: BackendPartnerUser;
    user?: BackendPartnerUser;
  };
  message?: string;
}

type BackendPartnerLoginResponse = BackendPartnerFlatLogin | BackendPartnerWrappedLogin;

const isWrapped = (r: BackendPartnerLoginResponse): r is BackendPartnerWrappedLogin =>
  'success' in r && 'data' in r;

const normalizeLogin = (res: BackendPartnerLoginResponse) => {
  if (isWrapped(res)) {
    const p = res.data.partner || res.data.user;
    return { accessToken: res.data.accessToken, refreshToken: res.data.refreshToken, partner: p };
  }
  return { accessToken: res.accessToken, refreshToken: res.refreshToken, partner: res.partner };
};

const SESSION_KEY = 'studhub-partner-session';
const ACCESS_TOKEN_KEY = 'studhub-partner-access-token';
const REFRESH_TOKEN_KEY = 'studhub-partner-refresh-token';

function mapPartner(p: BackendPartnerUser, fallbackEmail?: string): PartnerAccount {
  const email = p.email || p.loginEmail || fallbackEmail || '';
  return {
    id: String(p.id),
    name: (p.name || email.split('@')[0] || 'Partenaire').trim(),
    email,
    logoUrl: p.logoUrl || undefined,
    category: p.category || undefined,
    viewsCount: p.viewsCount,
    likesCount: p.likesCount,
    clicksCount: p.clicksCount,
    role: p.role || 'PARTNER',
  };
}

@Injectable({ providedIn: 'root' })
export class PartnerAuthService {
  private partnerSubject = new BehaviorSubject<PartnerAccount | null>(this.loadSession());
  partner$ = this.partnerSubject.asObservable();

  constructor(private http: HttpClient) {}

  get currentPartner(): PartnerAccount | null {
    return this.partnerSubject.value;
  }

  get isLoggedIn(): boolean {
    return !!this.currentPartner;
  }

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  async hydrateFromApi(): Promise<void> {
    if (!this.getAccessToken()) return;
    try {
      const raw: any = await firstValueFrom(this.http.get(`${environment.apiUrl}/auth/me`));
      const data: any = raw?.success && raw?.data !== undefined ? raw.data : raw;
      if (!data?.id) return;
      if (data.role !== 'PARTNER' && !data.loginEmail && !data.name) return;
      this.setSession(mapPartner(data));
    } catch {
      // garder session locale
    }
  }

  async login(email: string, password: string): Promise<ActionResult> {
    try {
      const res = await firstValueFrom(
        this.http.post<BackendPartnerLoginResponse>(`${environment.apiUrl}/auth/partner/login`, {
          email,
          password,
        }),
      );
      const { accessToken, refreshToken, partner } = normalizeLogin(res);
      if (!accessToken || !partner) {
        return { success: false, message: 'PARTNER_AUTH.ERROR_INVALID_CREDENTIALS' };
      }
      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      this.setSession(mapPartner(partner, email));
      await this.hydrateFromApi();
      return { success: true };
    } catch (err) {
      if (err instanceof HttpErrorResponse) {
        return { success: false, message: this.mapHttpError(err) };
      }
      return { success: false, message: 'PARTNER_AUTH.ERROR_NETWORK_UNAVAILABLE' };
    }
  }

  async refreshAccessToken(): Promise<boolean> {
    const currentRefresh = this.getRefreshToken();
    if (!currentRefresh) {
      this.clearSession();
      return false;
    }
    try {
      const res = await firstValueFrom(
        this.http.post<BackendPartnerLoginResponse>(`${environment.apiUrl}/auth/refresh`, {
          refreshToken: currentRefresh,
        }),
      );
      const { accessToken, refreshToken } = normalizeLogin(res);
      if (!accessToken) {
        this.clearSession();
        return false;
      }
      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      return true;
    } catch {
      this.clearSession();
      return false;
    }
  }

  clearSession(): void {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    this.partnerSubject.next(null);
  }

  logout(): void {
    this.clearSession();
    try {
      firstValueFrom(this.http.post(`${environment.apiUrl}/auth/logout`, {}, { withCredentials: true })).catch(() => {});
    } catch {}
  }

  private mapHttpError(err: HttpErrorResponse): string {
    switch (err.status) {
      case 401: return 'PARTNER_AUTH.ERROR_INVALID_CREDENTIALS';
      case 403: return 'PARTNER_AUTH.ERROR_FORBIDDEN';
      case 0: return 'PARTNER_AUTH.ERROR_NETWORK_UNAVAILABLE';
      default: return this.extractApiMessage(err) || 'PARTNER_AUTH.ERROR_INVALID_CREDENTIALS';
    }
  }

  private extractApiMessage(err: HttpErrorResponse): string | null {
    const m = err?.error?.message;
    if (typeof m === 'string' && m.trim()) return m;
    if (Array.isArray(m) && m.length) return String(m[0]);
    return null;
  }

  private setSession(partner: PartnerAccount): void {
    localStorage.setItem(SESSION_KEY, JSON.stringify(partner));
    this.partnerSubject.next(partner);
  }

  private loadSession(): PartnerAccount | null {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  }
}
