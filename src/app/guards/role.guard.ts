import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { AgentAuthService } from '../services/agent-auth.service';
import { PartnerAuthService } from '../services/partner-auth.service';
import { RegisterDraftService } from '../services/register-draft.service';

/**
 * Type de rôle autorisé par le guard.
 * - student  : doit être un étudiant connecté
 * - agent    : doit être un agent immobilier connecté
 * - partner  : doit être un partenaire connecté
 * - auth     : doit être authentifié (étudiant, agent ou partenaire)
 * - admin    : doit être un utilisateur avec role=ADMIN
 * - guest    : ne doit PAS être authentifié (login, register, forgot)
 */
export type RoleGuardKind = 'student' | 'agent' | 'partner' | 'admin' | 'auth' | 'guest';

const REDIRECT_STUDENT_HOME = ['/tabs', 'tab1'];
const REDIRECT_AGENT_HOME = ['/agent-dashboard', 'dashboard'];
const REDIRECT_PARTNER_HOME = ['/partner-dashboard'];
const REDIRECT_ADMIN_HOME = ['/admin'];
const REDIRECT_LOGIN = ['/login'];

function redirectToStudentHome(): UrlTree {
  return inject(Router).createUrlTree(REDIRECT_STUDENT_HOME);
}

function redirectToAgentHome(): UrlTree {
  return inject(Router).createUrlTree(REDIRECT_AGENT_HOME);
}

function redirectToPartnerHome(): UrlTree {
  return inject(Router).createUrlTree(REDIRECT_PARTNER_HOME);
}

function redirectToAdminHome(): UrlTree {
  return inject(Router).createUrlTree(REDIRECT_ADMIN_HOME);
}

function redirectToLogin(): UrlTree {
  return inject(Router).createUrlTree(REDIRECT_LOGIN);
}

function readKind(data: unknown): RoleGuardKind {
  const raw = (data as any)?.role as RoleGuardKind | undefined;
  return raw || 'auth';
}

export const roleGuard: CanActivateFn = (_route) => {
  const auth = inject(AuthService);
  const agentAuth = inject(AgentAuthService);
  const partnerAuth = inject(PartnerAuthService);
  const drafts = inject(RegisterDraftService);

  const kind = readKind(_route.data);
  const path = String(_route.routeConfig?.path || '');

  const hasStudent = !!auth.currentUser;
  const hasAgent = !!agentAuth.currentAgent;
  const hasPartner = !!partnerAuth.currentPartner;
  const hasAny = hasStudent || hasAgent || hasPartner;

  switch (kind) {
    case 'guest': {
      // Ne rediriger que si CE rôle-là est déjà connecté.
      // Sinon on bloque le switch Étudiant ↔ Agent ↔ Partenaire.
      if (path === 'partner-login') {
        return hasPartner ? redirectToPartnerHome() : true;
      }
      if (path === 'agent-login') {
        return hasAgent ? redirectToAgentHome() : true;
      }
      // Inscription agent : autoriser la reprise même si déjà connecté (brouillon)
      if (path === 'agent-register') {
        if (hasAgent && !drafts.hasAgentDraft()) return redirectToAgentHome();
        return true;
      }
      // Inscription étudiant : toujours accessible pour créer un compte.
      // (photo/welcome après création restent OK même si déjà connecté)
      if (path === 'register') {
        return true;
      }
      // login : si inscription en cours (OTP e-mail), y renvoyer plutôt que rester sur login
      if (path === 'login' || path === 'forgot-password' || path === 'verify-code' || path === 'reset-password') {
        const pending = drafts.pendingRegisterRoute();
        if (pending && !hasAny) {
          return inject(Router).createUrlTree([pending]);
        }
      }
      // login / forgot / verify / reset
      if (hasStudent && auth.isAdmin) return redirectToAdminHome();
      if (hasStudent) return redirectToStudentHome();
      return true;
    }

    case 'partner':
      if (hasPartner) return true;
      return inject(Router).createUrlTree(['/partner-login']);

    case 'agent':
      if (hasAgent) return true;
      return inject(Router).createUrlTree(['/agent-login']);

    case 'admin':
      if (auth.isAdmin) return true;
      if (hasPartner) return redirectToPartnerHome();
      if (hasAgent) return redirectToAgentHome();
      if (hasStudent) return redirectToStudentHome();
      return redirectToLogin();

    case 'student':
      if (hasStudent || hasAgent) return true;
      if (hasPartner) return redirectToPartnerHome();
      return redirectToLogin();

    case 'auth':
    default: {
      if (hasAny) return true;
      // Inscription en cours (ex. utilisateur sort pour lire l'e-mail OTP)
      const pending = drafts.pendingRegisterRoute();
      if (pending) {
        return inject(Router).createUrlTree([pending]);
      }
      return redirectToLogin();
    }
  }
};
