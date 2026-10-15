import { Injectable } from '@angular/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface RealEstateAgent {
  id: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  agencyName: string;
  email: string;
  phone?: string;
  activityType?: string;
  activityCity?: string;
  address?: string;
  websiteUrl?: string;
  description?: string;
  avatarUrl?: string;
  role?: string;
}

interface StoredAgent extends RealEstateAgent {
  password: string;
}

interface ActionResult {
  success: boolean;
  /** i18n translation key, not display text. */
  message?: string;
}

interface BackendAgentUser {
  id: number | string;
  email: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  agencyName?: string;
  phone?: string;
  activityType?: string;
  activityCity?: string;
  address?: string;
  websiteUrl?: string;
  description?: string;
  avatarUrl?: string;
  role?: string;
}

function mapBackendAgent(agent: BackendAgentUser, fallbackEmail?: string): RealEstateAgent {
  const email = agent.email || fallbackEmail || '';
  const agencyName = (agent.agencyName || '').trim() || 'Prestataire';
  const fullName = (
    agent.fullName ||
    `${agent.firstName || ''} ${agent.lastName || ''}`.trim() ||
    agencyName ||
    email.split('@')[0] ||
    'Agent'
  ).trim();
  return {
    id: String(agent.id),
    fullName,
    firstName: agent.firstName || undefined,
    lastName: agent.lastName || undefined,
    agencyName,
    email,
    phone: agent.phone || undefined,
    activityType: agent.activityType || undefined,
    activityCity: agent.activityCity || undefined,
    address: agent.address || undefined,
    websiteUrl: agent.websiteUrl || undefined,
    description: agent.description || undefined,
    avatarUrl: (agent.avatarUrl || '').trim() || undefined,
    role: agent.role || 'AGENT',
  };
}

interface BackendAgentFlatLogin {
  agent: BackendAgentUser;
  accessToken: string;
  refreshToken?: string;
}

interface BackendAgentWrappedLogin {
  success: boolean;
  data: {
    accessToken: string;
    refreshToken?: string;
    user?: BackendAgentUser;
    agent?: BackendAgentUser;
  };
  message?: string;
}

type BackendAgentLoginResponse = BackendAgentFlatLogin | BackendAgentWrappedLogin;

const isAgentWrapped = (r: BackendAgentLoginResponse): r is BackendAgentWrappedLogin =>
  'success' in r && 'data' in r;

const normalizeAgentLogin = (res: BackendAgentLoginResponse) => {
  if (isAgentWrapped(res)) {
    const u = res.data.agent || res.data.user;
    return { accessToken: res.data.accessToken, refreshToken: res.data.refreshToken, agent: u };
  }
  return { accessToken: res.accessToken, refreshToken: res.refreshToken, agent: res.agent };
};

const AGENTS_KEY = 'studhub-agents';
const SESSION_KEY = 'studhub-agent-session';
const ACCESS_TOKEN_KEY = 'studhub-agent-access-token';
const REFRESH_TOKEN_KEY = 'studhub-agent-refresh-token';
const SEED_MARKER_KEY = 'studhub-agents-seeded-v1';

@Injectable({ providedIn: 'root' })
export class AgentAuthService {

  private agentSubject = new BehaviorSubject<RealEstateAgent | null>(this.loadSession());
  agent$ = this.agentSubject.asObservable();

  constructor(private http: HttpClient) {
    this.ensureSeeded();
  }

  /** Recharge le profil agent depuis GET /auth/me. */
  async hydrateFromApi(): Promise<void> {
    const token = this.getAccessToken();
    if (!token) {
      if (this.currentAgent) this.clearSession();
      return;
    }
    try {
      const raw: any = await firstValueFrom(this.http.get(`${environment.apiUrl}/auth/me`));
      const data: any = raw?.success && raw?.data !== undefined ? raw.data : raw;
      if (!data?.id || !data?.email) {
        this.clearSession();
        return;
      }
      // Profil étudiant (fullName, pas agencyName) → ignoré ici
      if (data.agencyName == null && data.fullName != null) return;
      this.setSession(mapBackendAgent(data));
    } catch (err) {
      if (err instanceof HttpErrorResponse && (err.status === 401 || err.status === 403)) {
        this.clearSession();
      }
    }
  }

  get currentAgent(): RealEstateAgent | null {
    return this.agentSubject.value;
  }

  get isLoggedIn(): boolean {
    return !!this.currentAgent;
  }

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  /** Returns the logged-in agent, or a lightweight guest fallback so the agent space always renders. */
  get currentAgentOrGuest(): RealEstateAgent {
    return this.currentAgent || {
      id: 'guest',
      fullName: 'Agent invité',
      agencyName: 'Mon agence',
      email: '',
      phone: ''
    };
  }

  /**
   * POST /auth/send-register-otp → OTP e-mail.
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
        const msg = this.extractApiMessage(err) || this.mapHttpError(err, 'AGENT_AUTH.ERROR_SEND_OTP');
        throw new Error(msg);
      }
      return { sent: false, email: cleanEmail, expiresInSec: 600 };
    }
  }

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

  async register(
    fullName: string,
    agencyName: string,
    email: string,
    phone: string,
    password: string,
    otpCode?: string,
    extras?: {
      firstName?: string;
      lastName?: string;
      activityType?: string;
      activityCity?: string;
      confirmPassword?: string;
      acceptTerms?: boolean;
    },
  ): Promise<ActionResult> {
    try {
      const body = {
        fullName,
        agencyName: agencyName || undefined,
        email,
        phone,
        password,
        otpCode,
        firstName: extras?.firstName,
        lastName: extras?.lastName,
        activityType: extras?.activityType,
        activityCity: extras?.activityCity,
        confirmPassword: extras?.confirmPassword,
        acceptTerms: extras?.acceptTerms ?? true,
      };
      if (!otpCode || !/^\d{6}$/.test(otpCode)) {
        return { success: false, message: 'AUTH.OTP_REQUIRED' };
      }
      const res = await firstValueFrom(this.http.post<BackendAgentLoginResponse>(`${environment.apiUrl}/auth/agent/register`, body));
      const { accessToken, refreshToken, agent } = normalizeAgentLogin(res);
      if (!accessToken || !agent) return { success: false, message: 'AGENT_AUTH.ERROR_INVALID_CREDENTIALS' };
      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      this.setSession(mapBackendAgent(agent, email));
      await this.hydrateFromApi();
      return { success: true };
    } catch (err) {
      if (err instanceof HttpErrorResponse) {
        return { success: false, message: this.mapHttpError(err, 'AGENT_AUTH.ERROR_EMAIL_TAKEN') };
      }
      return this.registerLocal(fullName, agencyName, email, phone, password);
    }
  }

  async login(email: string, password: string): Promise<ActionResult> {
    try {
      const res = await firstValueFrom(
        this.http.post<BackendAgentLoginResponse>(`${environment.apiUrl}/auth/agent/login`, { email, password }),
      );
      const { accessToken, refreshToken, agent } = normalizeAgentLogin(res);
      if (!accessToken || !agent) return { success: false, message: 'AGENT_AUTH.ERROR_INVALID_CREDENTIALS' };
      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      this.setSession(mapBackendAgent(agent, email));
      await this.hydrateFromApi();
      return { success: true };
    } catch (err) {
      if (err instanceof HttpErrorResponse) {
        return { success: false, message: this.mapHttpError(err, 'AGENT_AUTH.ERROR_INVALID_CREDENTIALS') };
      }
      return this.loginLocal(email, password);
    }
  }

  /**
   * Échange le refresh token agent contre un nouveau access token.
   * Retourne true si succès, false sinon (session nettoyée).
   */
  async refreshAccessToken(): Promise<boolean> {
    const currentRefresh = this.getRefreshToken();
    if (!currentRefresh) {
      this.clearSession();
      return false;
    }
    try {
      const res = await firstValueFrom(
        this.http.post<BackendAgentLoginResponse>(`${environment.apiUrl}/auth/refresh`, {
          refreshToken: currentRefresh,
        }),
      );
      const { accessToken, refreshToken } = normalizeAgentLogin(res);
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
    this.agentSubject.next(null);
  }

  logout(): void {
    this.clearSession();
    try {
      firstValueFrom(this.http.post(`${environment.apiUrl}/auth/logout`, {}, { withCredentials: true })).catch(() => {});
    } catch {}
  }

  async updateProfile(updates: {
    firstName?: string;
    lastName?: string;
    agencyName?: string;
    phone?: string;
    activityCity?: string;
    address?: string;
    websiteUrl?: string;
    description?: string;
    avatarUrl?: string;
  }): Promise<ActionResult> {
    const current = this.currentAgent;
    if (!current) return { success: false, message: 'AUTH.ERROR_NOT_LOGGED_IN' };
    try {
      const res = await firstValueFrom(
        this.http.patch<any>(`${environment.apiUrl}/agents/me`, updates),
      );
      const data: any = res?.success && res?.data !== undefined ? res.data : res;
      if (data?.id) {
        this.setSession(mapBackendAgent(data, current.email));
        return { success: true };
      }
      this.setSession({ ...current, ...updates, fullName: `${updates.firstName || current.firstName || ''} ${updates.lastName || current.lastName || ''}`.trim() || current.fullName });
      return { success: true };
    } catch (err) {
      if (err instanceof HttpErrorResponse) {
        return { success: false, message: this.mapHttpError(err, 'AUTH.ERROR_ACCOUNT_NOT_FOUND') };
      }
      return { success: false, message: 'AUTH.ERROR_NETWORK_UNAVAILABLE' };
    }
  }

  /* ===================== FALLBACK LOCALSTORAGE ===================== */

  private registerLocal(fullName: string, agencyName: string, email: string, phone: string, password: string): ActionResult {
    const agents = this.loadAgents();
    if (agents.some(a => a.email.toLowerCase() === email.toLowerCase())) {
      return { success: false, message: 'AGENT_AUTH.ERROR_EMAIL_TAKEN' };
    }
    const agent: StoredAgent = { id: this.generateId(), fullName, agencyName, email, phone, password };
    agents.push(agent);
    localStorage.setItem(AGENTS_KEY, JSON.stringify(agents));
    this.setSession(agent);
    return { success: true };
  }

  private loginLocal(email: string, password: string): ActionResult {
    const agents = this.loadAgents();
    const found = agents.find(a => a.email.toLowerCase() === email.toLowerCase() && a.password === password);
    if (!found) return { success: false, message: 'AGENT_AUTH.ERROR_INVALID_CREDENTIALS' };
    this.setSession(found);
    return { success: true };
  }

  /* ===================== HELPERS ===================== */

  private mapHttpError(err: HttpErrorResponse, fallbackKey: string): string {
    switch (err.status) {
      case 400: return this.extractApiMessage(err) || 'AGENT_AUTH.ERROR_VALIDATION';
      case 401: return 'AGENT_AUTH.ERROR_INVALID_CREDENTIALS';
      case 403: return 'AGENT_AUTH.ERROR_FORBIDDEN';
      case 404: return 'AGENT_AUTH.ERROR_ACCOUNT_NOT_FOUND';
      case 409: return 'AGENT_AUTH.ERROR_EMAIL_TAKEN';
      case 429: return 'AGENT_AUTH.ERROR_TOO_MANY_ATTEMPTS';
      case 0:   return 'AGENT_AUTH.ERROR_NETWORK_UNAVAILABLE';
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
    if (localStorage.getItem(SEED_MARKER_KEY) !== '3') {
      try {
        localStorage.removeItem(AGENTS_KEY);
      } catch { /* ignore */ }
      localStorage.setItem(SEED_MARKER_KEY, '3');
    }
  }

  private loadAgents(): StoredAgent[] {
    const raw = localStorage.getItem(AGENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  }

  private setSession(agent: RealEstateAgent | StoredAgent): void {
    try {
      localStorage.setItem('studhub-onboarding-seen', 'true');
    } catch {
      /* ignore */
    }
    const publicAgent: RealEstateAgent = 'password' in agent
      ? (() => { const { password, ...rest } = agent as StoredAgent; return rest; })()
      : agent;
    localStorage.setItem(SESSION_KEY, JSON.stringify(publicAgent));
    this.agentSubject.next(publicAgent);
  }

  private loadSession(): RealEstateAgent | null {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }
}
