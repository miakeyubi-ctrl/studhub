import { Injectable } from '@angular/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface StudUser {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  nationality?: string;
  city?: string;
  university?: string;
  studyLevel?: string;
  bio?: string;
  avatarUrl?: string;
  role?: string;
}

interface StoredUser extends StudUser {
  password: string;
}

interface ResetRequest {
  email: string;
  code: string;
  expires: number;
}

interface ActionResult {
  success: boolean;
  /** i18n translation key (e.g. 'AUTH.ERROR_INVALID_CREDENTIALS'), not display text. */
  message?: string;
}

interface SendCodeResult extends ActionResult {
  devCode?: string;
}

interface BackendUser {
  id: number | string;
  email: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  nationality?: string;
  city?: string;
  university?: string;
  studyLevel?: string;
  bio?: string;
  avatarUrl?: string;
  role?: string;
}

function mapBackendUser(user: BackendUser, fallbackEmail?: string): StudUser {
  const email = user.email || fallbackEmail || '';
  const fullName =
    (user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || email.split('@')[0] || 'Étudiant').trim();
  return {
    id: String(user.id),
    fullName,
    email,
    phone: user.phone || undefined,
    nationality: user.nationality || undefined,
    city: user.city || undefined,
    university: user.university || undefined,
    studyLevel: user.studyLevel || undefined,
    bio: user.bio || undefined,
    avatarUrl: (user.avatarUrl || '').trim() || undefined,
    role: user.role || 'STUDENT',
  };
}

interface BackendFlatLogin {
  user: BackendUser;
  accessToken: string;
  refreshToken?: string;
}

interface BackendWrappedLogin {
  success: boolean;
  data: {
    accessToken: string;
    refreshToken?: string;
    user: BackendUser;
  };
  message?: string;
}

type BackendLoginResponse = BackendFlatLogin | BackendWrappedLogin;

const isWrapped = (r: BackendLoginResponse): r is BackendWrappedLogin =>
  'success' in r && 'data' in r;

const normalizeLogin = (res: BackendLoginResponse) => {
  if (isWrapped(res)) {
    return { accessToken: res.data.accessToken, refreshToken: res.data.refreshToken, user: res.data.user };
  }
  return { accessToken: res.accessToken, refreshToken: res.refreshToken, user: res.user };
};

const USERS_KEY = 'studhub-users';
const SESSION_KEY = 'studhub-session';
const ACCESS_TOKEN_KEY = 'studhub-access-token';
const REFRESH_TOKEN_KEY = 'studhub-refresh-token';
const RESET_KEY = 'studhub-reset-request';
const SEED_MARKER_KEY = 'studhub-users-seeded-v1';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private userSubject = new BehaviorSubject<StudUser | null>(this.loadSession());
  user$ = this.userSubject.asObservable();

  get currentUser(): StudUser | null {
    return this.userSubject.value;
  }

  get isLoggedIn(): boolean {
    return !!this.currentUser;
  }

  get isAdmin(): boolean {
    return this.currentUser?.role === 'ADMIN';
  }

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  constructor(private http: HttpClient) {
    this.ensureSeeded();
  }

  /** Rafraîchit la session avec GET /auth/me (données BDD, pas mock). */
  async hydrateFromApi(): Promise<void> {
    const token = this.getAccessToken();
    // Session locale sans JWT (ex. ancien mode offline) → invalide après wipe serveur
    if (!token) {
      if (this.currentUser) this.clearSession();
      return;
    }
    try {
      const raw: any = await firstValueFrom(this.http.get(`${environment.apiUrl}/auth/me`));
      const data: any = raw?.success && raw?.data !== undefined ? raw.data : raw;
      if (!data?.id || !data?.email) {
        this.clearSession();
        return;
      }
      // Réponse agent (agencyName) → ignorée ici
      if (data.agencyName != null && data.fullName == null) return;
      this.setSession(mapBackendUser(data));
    } catch (err) {
      // Token mort / compte supprimé (wipe BDD) → ne jamais garder un fantôme type « yousef »
      if (err instanceof HttpErrorResponse && (err.status === 401 || err.status === 403)) {
        this.clearSession();
      }
      // API down (réseau) : on laisse la session pour le mode offline éventuel
    }
  }

  /**
   * Envoie un OTP e-mail pour création de compte.
   */
  async sendRegisterOtp(email: string): Promise<{ sent: boolean; email: string; expiresInSec: number; devCode?: string; storedBy?: string; delivery?: string }> {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail) return { sent: false, email: cleanEmail, expiresInSec: 600 };
    try {
      const raw: any = await firstValueFrom(
        this.http.post(`${environment.apiUrl}/auth/send-register-otp`, { email: cleanEmail }),
      );
      const data: any = raw?.success && raw?.data ? raw.data : raw;
      return {
        sent: !!data?.sent,
        email: data?.email || cleanEmail,
        expiresInSec: Number(data?.expiresInSec || 600),
        devCode: data?.devCode,
        storedBy: data?.storedBy,
        delivery: data?.delivery,
      };
    } catch (err) {
      if (err instanceof HttpErrorResponse) {
        const msg = this.extractApiMessage(err) || this.mapHttpError(err, 'AUTH.ERROR_SEND_OTP');
        throw new Error(msg);
      }
      return { sent: false, email: cleanEmail, expiresInSec: 600 };
    }
  }

  /** Vérifie l'OTP d'inscription sans le consommer. */
  async verifyRegisterOtp(email: string, code: string): Promise<{ valid: boolean; email?: string; message?: string }> {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanCode = (code || '').trim();
    if (!cleanEmail || cleanCode.length !== 6) {
      return { valid: false, message: 'AUTH.OTP_REQUIRED' };
    }
    try {
      const raw: any = await firstValueFrom(
        this.http.post(`${environment.apiUrl}/auth/verify-register-otp`, { email: cleanEmail, code: cleanCode }),
      );
      const data: any = raw?.success && raw?.data ? raw.data : raw;
      return { valid: !!data?.valid, email: data?.email || cleanEmail };
    } catch (err) {
      if (err instanceof HttpErrorResponse) {
        const msg = this.extractApiMessage(err) || this.mapHttpError(err, 'AUTH.OTP_FAILED');
        return { valid: false, message: msg };
      }
      return { valid: false, message: 'AUTH.OTP_FAILED' };
    }
  }

  /**
   * Appelle le backend réel : POST /api/v1/auth/student/register + otpCode.
   * Si backend indisponible → fallback sur localStorage (mode offline).
   */
  async register(
    fullName: string,
    email: string,
    password: string,
    phone?: string,
    university?: string,
    otpCode?: string,
    extras?: {
      firstName?: string;
      lastName?: string;
      nationality?: string;
      city?: string;
      confirmPassword?: string;
      acceptTerms?: boolean;
    },
  ): Promise<ActionResult> {
    try {
      const body = {
        fullName,
        email,
        password,
        phone,
        university,
        otpCode,
        firstName: extras?.firstName,
        lastName: extras?.lastName,
        nationality: extras?.nationality,
        city: extras?.city,
        confirmPassword: extras?.confirmPassword,
        acceptTerms: extras?.acceptTerms ?? true,
      };
      if (!otpCode || !/^\d{6}$/.test(otpCode)) {
        return { success: false, message: 'AUTH.OTP_REQUIRED' };
      }
      const res = await firstValueFrom(this.http.post<BackendLoginResponse>(`${environment.apiUrl}/auth/student/register`, body));
      const { accessToken, refreshToken, user } = normalizeLogin(res);
      if (!accessToken || !user) return { success: false, message: 'AUTH.ERROR_INVALID_CREDENTIALS' };
      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      this.setSession(mapBackendUser(user, email));
      await this.hydrateFromApi();
      return { success: true };
    } catch (err) {
      if (err instanceof HttpErrorResponse) {
        return { success: false, message: this.mapHttpError(err, 'AUTH.ERROR_EMAIL_TAKEN') };
      }
      // Fallback offline localStorage
      return this.registerLocal(fullName, email, password, phone, university);
    }
  }

  /**
   * Appelle le backend réel : POST /api/v1/auth/student/login
   * Si backend indisponible → fallback sur localStorage (mode offline).
   */
  async login(email: string, password: string): Promise<ActionResult> {
    try {
      const res = await firstValueFrom(
        this.http.post<BackendLoginResponse>(`${environment.apiUrl}/auth/student/login`, { email, password }),
      );
      const { accessToken, refreshToken, user } = normalizeLogin(res);
      if (!accessToken || !user) return { success: false, message: 'AUTH.ERROR_INVALID_CREDENTIALS' };
      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      this.setSession(mapBackendUser(user, email));
      // Recharge le profil complet depuis la BDD (bio, avatar, etc.)
      await this.hydrateFromApi();
      return { success: true };
    } catch (err) {
      if (err instanceof HttpErrorResponse) {
        return { success: false, message: this.mapHttpError(err, 'AUTH.ERROR_INVALID_CREDENTIALS') };
      }
      // Fallback offline localStorage
      return this.loginLocal(email, password);
    }
  }

  /**
   * Échange le refresh token contre un nouveau access token (JWT access + refresh).
   * Retourne true si l'échange a réussi, false sinon (session sera nettoyée).
   */
  async refreshAccessToken(): Promise<boolean> {
    const currentRefresh = this.getRefreshToken();
    if (!currentRefresh) {
      this.clearSession();
      return false;
    }
    try {
      const res = await firstValueFrom(
        this.http.post<BackendLoginResponse>(`${environment.apiUrl}/auth/refresh`, {
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

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  clearSession(): void {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    this.userSubject.next(null);
  }

  logout(): void {
    this.clearSession();
    try {
      firstValueFrom(this.http.post(`${environment.apiUrl}/auth/logout`, {}, { withCredentials: true })).catch(() => {});
    } catch {}
  }

  /** Supprime définitivement le compte (mot de passe requis). */
  async deleteAccount(password: string): Promise<ActionResult> {
    const current = this.currentUser;
    if (!current) return { success: false, message: 'AUTH.ERROR_NOT_LOGGED_IN' };
    try {
      await firstValueFrom(
        this.http.delete(`${environment.apiUrl}/users/me`, {
          body: { password },
        }),
      );
      this.clearSession();
      return { success: true, message: 'PRIVACY_PAGE.DELETE_OK' };
    } catch (err) {
      if (err instanceof HttpErrorResponse) {
        if (err.status === 401) return { success: false, message: 'PRIVACY_PAGE.DELETE_BAD_PASSWORD' };
        return { success: false, message: this.mapHttpError(err, 'PRIVACY_PAGE.DELETE_ERROR') };
      }
      return { success: false, message: 'PRIVACY_PAGE.DELETE_ERROR' };
    }
  }

  async updateProfile(updates: {
    fullName?: string;
    phone?: string;
    nationality?: string;
    city?: string;
    university?: string;
    studyLevel?: string;
    bio?: string;
    avatarUrl?: string;
  }): Promise<ActionResult> {
    const current = this.currentUser;
    if (!current) return { success: false, message: 'AUTH.ERROR_NOT_LOGGED_IN' };
    try {
      const res = await firstValueFrom(this.http.patch<any>(`${environment.apiUrl}/users/${current.id}`, updates));
      const data: any = res?.success && res?.data !== undefined ? res.data : res;
      if (data?.id) {
        this.setSession(mapBackendUser(data));
        return { success: true };
      }
      if (res?.success) {
        this.setSession({ ...current, ...updates });
        return { success: true };
      }
      return { success: false, message: 'AUTH.ERROR_ACCOUNT_NOT_FOUND' };
    } catch (err) {
      if (err instanceof HttpErrorResponse) {
        return { success: false, message: this.mapHttpError(err, 'AUTH.ERROR_ACCOUNT_NOT_FOUND') };
      }
      // Fallback offline
      return this.updateProfileLocal(updates);
    }
  }

  async sendResetCode(email: string): Promise<SendCodeResult> {
    const clean = (email || '').trim().toLowerCase();
    try {
      const raw: any = await firstValueFrom(
        this.http.post(`${environment.apiUrl}/auth/forgot-password`, { email: clean }),
      );
      const data: any = raw?.success && raw?.data ? raw.data : raw;
      return { success: true, devCode: data?.devCode };
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status >= 400 && err.status < 500) {
        return { success: false, message: this.mapHttpError(err, 'AUTH.ERROR_EMAIL_REQUIRED') };
      }
      return this.sendResetCodeLocal(clean);
    }
  }

  async verifyResetCode(email: string, code: string): Promise<ActionResult> {
    const clean = (email || '').trim().toLowerCase();
    try {
      const res = await firstValueFrom(
        this.http.post<any>(`${environment.apiUrl}/auth/verify-code`, { email: clean, code }),
      );
      if (res?.success || res?.valid || res?.data?.valid) return { success: true };
      return { success: false, message: res?.message || 'AUTH.ERROR_CODE_INCORRECT' };
    } catch (err) {
      return this.verifyResetCodeLocal(clean, code);
    }
  }

  async resetPassword(email: string, code: string, newPassword: string): Promise<ActionResult> {
    const clean = (email || '').trim().toLowerCase();
    try {
      const res = await firstValueFrom(
        this.http.post<any>(`${environment.apiUrl}/auth/reset-password`, { email: clean, code, newPassword }),
      );
      if (res?.success || res?.data?.changed || res?.changed) return { success: true };
      return { success: false, message: res?.message || 'AUTH.ERROR_CODE_INCORRECT' };
    } catch (err) {
      return this.resetPasswordLocal(clean, code, newPassword);
    }
  }

  /* ===================== FALLBACK LOCALSTORAGE ===================== */

  private registerLocal(fullName: string, email: string, password: string, phone?: string, university?: string): ActionResult {
    const users = this.loadUsers();
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      return { success: false, message: 'AUTH.ERROR_EMAIL_TAKEN' };
    }
    const user: StoredUser = { id: this.generateId(), fullName, email, phone, university, password };
    users.push(user);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    this.setSession(user);
    return { success: true };
  }

  private loginLocal(email: string, password: string): ActionResult {
    const users = this.loadUsers();
    const found = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (!found) return { success: false, message: 'AUTH.ERROR_INVALID_CREDENTIALS' };
    this.setSession(found);
    return { success: true };
  }

  private updateProfileLocal(updates: {
    fullName?: string;
    phone?: string;
    university?: string;
    studyLevel?: string;
    bio?: string;
    avatarUrl?: string;
  }): ActionResult {
    const current = this.currentUser;
    if (!current) return { success: false, message: 'AUTH.ERROR_NOT_LOGGED_IN' };
    const users = this.loadUsers();
    const index = users.findIndex(u => u.id === current.id);
    if (index === -1) return { success: false, message: 'AUTH.ERROR_ACCOUNT_NOT_FOUND' };
    users[index] = { ...users[index], ...updates };
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    this.setSession(users[index]);
    return { success: true };
  }

  private sendResetCodeLocal(email: string): SendCodeResult {
    const users = this.loadUsers();
    const clean = email.trim().toLowerCase();
    if (!users.some(u => (u.email || '').toLowerCase() === clean)) {
      return { success: false, message: 'AUTH.ERROR_NO_ACCOUNT' };
    }
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const request: ResetRequest = { email: clean, code, expires: Date.now() + 10 * 60 * 1000 };
    localStorage.setItem(RESET_KEY, JSON.stringify(request));
    return { success: true, devCode: code };
  }

  private verifyResetCodeLocal(email: string, code: string): ActionResult {
    const request = this.loadResetRequest();
    if (!request || request.email !== email.trim().toLowerCase()) return { success: false, message: 'AUTH.ERROR_NO_CODE_SENT' };
    if (Date.now() > request.expires) return { success: false, message: 'AUTH.ERROR_CODE_EXPIRED' };
    if (request.code !== code) return { success: false, message: 'AUTH.ERROR_CODE_INCORRECT' };
    return { success: true };
  }

  private resetPasswordLocal(email: string, code: string, newPassword: string): ActionResult {
    const verification = this.verifyResetCodeLocal(email, code);
    if (!verification.success) return verification;
    const users = this.loadUsers();
    const clean = email.trim().toLowerCase();
    const index = users.findIndex(u => (u.email || '').toLowerCase() === clean);
    if (index === -1) return { success: false, message: 'AUTH.ERROR_ACCOUNT_NOT_FOUND' };
    users[index].password = newPassword;
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    localStorage.removeItem(RESET_KEY);
    return { success: true };
  }

  /* ===================== HELPERS ===================== */

  private mapHttpError(err: HttpErrorResponse, fallbackKey: string): string {
    switch (err.status) {
      case 400: return this.extractApiMessage(err) || 'AUTH.ERROR_VALIDATION';
      case 401: return 'AUTH.ERROR_INVALID_CREDENTIALS';
      case 403: return 'AUTH.ERROR_FORBIDDEN';
      case 404: return 'AUTH.ERROR_ACCOUNT_NOT_FOUND';
      case 409: return 'AUTH.ERROR_EMAIL_TAKEN';
      case 429: return 'AUTH.ERROR_TOO_MANY_ATTEMPTS';
      case 0:   return 'AUTH.ERROR_NETWORK_UNAVAILABLE';
      default:  return fallbackKey;
    }
  }

  private extractApiMessage(err: HttpErrorResponse): string | null {
    const m = err?.error?.message;
    if (typeof m === 'string' && m.trim()) return m;
    if (Array.isArray(m) && m.length) return String(m[0]);
    return null;
  }

  private ensureSeeded(): void {
    // Plus de comptes démo locaux — source de vérité = backend.
    // One-shot : purge des faux users offline (etudiant@, yousef local, etc.)
    if (localStorage.getItem(SEED_MARKER_KEY) !== '3') {
      try {
        localStorage.removeItem(USERS_KEY);
      } catch { /* ignore */ }
      localStorage.setItem(SEED_MARKER_KEY, '3');
    }
  }

  private loadUsers(): StoredUser[] {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  }

  private loadResetRequest(): ResetRequest | null {
    const raw = localStorage.getItem(RESET_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  private setSession(user: StudUser | StoredUser): void {
    const publicUser: StudUser = 'password' in user
      ? (() => { const { password, ...rest } = user as StoredUser; return rest; })()
      : user;
    localStorage.setItem(SESSION_KEY, JSON.stringify(publicUser));
    // Évite de revoir l'onboarding « Passer » après login / reprise app
    try {
      localStorage.setItem('studhub-onboarding-seen', 'true');
    } catch {
      /* ignore */
    }
    this.userSubject.next(publicUser);
  }

  private loadSession(): StudUser | null {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }
}
