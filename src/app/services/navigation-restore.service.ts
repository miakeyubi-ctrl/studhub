import { Injectable } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { filter } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { AgentAuthService } from './agent-auth.service';
import { RegisterDraftService } from './register-draft.service';

const LAST_ROUTE_KEY = 'studhub-last-route';

const SKIP_PREFIXES = [
  '/login',
  '/forgot-password',
  '/verify-code',
  '/reset-password',
  '/onbroading',
  '/agent-login',
  '/partner-login',
];

@Injectable({ providedIn: 'root' })
export class NavigationRestoreService {
  private tracking = false;
  private resumeBound = false;

  constructor(
    private router: Router,
    private auth: AuthService,
    private agentAuth: AgentAuthService,
    private drafts: RegisterDraftService,
  ) {}

  /** Enregistre la route courante à chaque navigation. */
  startTracking(): void {
    if (this.tracking) return;
    this.tracking = true;
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        const url = e.urlAfterRedirects || e.url;
        if (this.shouldPersist(url)) {
          try {
            localStorage.setItem(LAST_ROUTE_KEY, url);
          } catch {
            /* ignore */
          }
        }
      });

    if (this.resumeBound) return;
    this.resumeBound = true;

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          void this.restoreLastRoute();
        }
      });
    }

    if (Capacitor.isNativePlatform()) {
      void App.addListener('appStateChange', ({ isActive }) => {
        const url = this.router.url || '';
        if (!isActive) {
          if (this.shouldPersist(url)) {
            try {
              localStorage.setItem(LAST_ROUTE_KEY, url);
            } catch {
              /* ignore */
            }
          }
          return;
        }
        void this.restoreLastRoute();
      }).catch(() => undefined);
    }
  }

  /**
   * Au démarrage / retour app :
   * 1) reprise d'inscription en cours (OTP / e-mail)
   * 2) sinon dernière page si connecté
   */
  async restoreLastRoute(): Promise<boolean> {
    const current = this.router.url || '';

    // Ne jamais écraser un écran d'auth / inscription en cours
    if (
      current.startsWith('/register') ||
      current.startsWith('/agent-register') ||
      current.startsWith('/login') ||
      current.startsWith('/agent-login') ||
      current.startsWith('/partner-login') ||
      current.startsWith('/forgot-password') ||
      current.startsWith('/verify-code') ||
      current.startsWith('/reset-password')
    ) {
      return false;
    }

    const loggedIn = !!this.auth.currentUser || !!this.agentAuth.currentAgent;

    // Compte déjà créé + session OK → ne pas renvoyer sur l'écran « Passer » (welcome)
    if (loggedIn) {
      const studentDraft = this.drafts.loadStudent();
      if (studentDraft?.accountCreated && studentDraft.step === 'welcome') {
        this.drafts.clearStudent();
      }
      const agentDraft = this.drafts.loadAgent();
      if (agentDraft && this.agentAuth.currentAgent) {
        this.drafts.clearAgent();
      }
    }

    const pendingRegister = this.drafts.pendingRegisterRoute();
    if (pendingRegister && !loggedIn) {
      if (current === pendingRegister || current.startsWith(pendingRegister + '?')) {
        return false;
      }
      try {
        await this.router.navigateByUrl(pendingRegister, { replaceUrl: true });
        return true;
      } catch {
        return false;
      }
    }

    const url = (localStorage.getItem(LAST_ROUTE_KEY) || '').trim();
    if (!url || !this.shouldPersist(url)) return false;

    if (!loggedIn) return false;

    if (current === url) return false;
    if (current.startsWith('/messages/')) return false;
    // Ne pas ramener vers onboarding / auth après déverrouillage
    if (url.startsWith('/onbroading') || url.startsWith('/register') || url.startsWith('/login')) {
      return false;
    }

    try {
      await this.router.navigateByUrl(url, { replaceUrl: true });
      return true;
    } catch {
      return false;
    }
  }

  private shouldPersist(url: string): boolean {
    if (!url || url === '/') return false;
    if (url === '/register' || url.startsWith('/register?')) return true;
    if (url === '/agent-register' || url.startsWith('/agent-register?')) return true;
    return !SKIP_PREFIXES.some((p) => url === p || url.startsWith(p + '/'));
  }
}
