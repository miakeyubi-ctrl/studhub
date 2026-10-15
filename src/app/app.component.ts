import { Component, OnInit } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { ThemeService } from './services/theme.service';
import { LanguageService } from './services/language.service';
import { AuthService } from './services/auth.service';
import { AgentAuthService } from './services/agent-auth.service';
import { PushNotificationsService } from './services/push-notifications.service';
import { CallService } from './services/call.service';
import { NavigationRestoreService } from './services/navigation-restore.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit {
  constructor(
    private themeService: ThemeService,
    private languageService: LanguageService,
    private auth: AuthService,
    private agentAuth: AgentAuthService,
    private push: PushNotificationsService,
    private navRestore: NavigationRestoreService,
    _calls: CallService,
  ) {
    this.languageService.init();
    // Masque immédiatement le splash natif (souvent blanc) pour laisser
    // apparaître le splash HTML StudHub — évite la page blanche au lancement.
    void this.hideNativeSplash();
  }

  ngOnInit(): void {
    this.navRestore.startTracking();
    void (async () => {
      const minSplashMs = 1600;
      const started = Date.now();

      // Valide la session serveur AVANT toute navigation (purge fantômes type « yousef »)
      await Promise.all([
        this.auth.hydrateFromApi(),
        this.agentAuth.hydrateFromApi(),
      ]);
      // Push après hydrate pour éviter un 401 → redirect login pendant l'inscription
      await this.push.init().catch(() => undefined);
      await this.navRestore.restoreLastRoute();

      const wait = Math.max(0, minSplashMs - (Date.now() - started));
      if (wait > 0) {
        await new Promise((r) => setTimeout(r, wait));
      }
      await this.hideHtmlSplash();
    })();
  }

  private async hideNativeSplash(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await SplashScreen.hide({ fadeOutDuration: 150 });
    } catch {
      /* plugin absent */
    }
  }

  private async hideHtmlSplash(): Promise<void> {
    const el = document.getElementById('studhub-boot-splash');
    if (el) {
      el.classList.add('hidden');
      window.setTimeout(() => el.remove(), 500);
    }
    await this.hideNativeSplash();
  }
}
