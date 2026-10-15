import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { AgentAuthService } from '../services/agent-auth.service';
import { PartnerAuthService } from '../services/partner-auth.service';

export const ONBOARDING_SEEN_KEY = 'studhub-onboarding-seen';

export const onboardingGuard: CanActivateFn = () => {
  const router = inject(Router);
  const auth = inject(AuthService);
  const agentAuth = inject(AgentAuthService);
  const partnerAuth = inject(PartnerAuthService);

  const loggedIn =
    !!auth.currentUser || !!agentAuth.currentAgent || !!partnerAuth.currentPartner;

  // Déjà connecté ou onboarding déjà vu → ne jamais rebloquer sur « Passer »
  if (loggedIn || localStorage.getItem(ONBOARDING_SEEN_KEY) === 'true') {
    try {
      localStorage.setItem(ONBOARDING_SEEN_KEY, 'true');
    } catch {
      /* ignore */
    }
    return router.parseUrl('/tabs/tab1');
  }

  return true;
};
