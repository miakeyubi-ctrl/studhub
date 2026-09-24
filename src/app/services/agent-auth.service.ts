import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface RealEstateAgent {
  id: string;
  fullName: string;
  agencyName: string;
  email: string;
  phone?: string;
}

interface StoredAgent extends RealEstateAgent {
  password: string;
}

interface ActionResult {
  success: boolean;
  /** i18n translation key, not display text. */
  message?: string;
}

const AGENTS_KEY = 'studhub-agents';
const SESSION_KEY = 'studhub-agent-session';

@Injectable({ providedIn: 'root' })
export class AgentAuthService {

  private agentSubject = new BehaviorSubject<RealEstateAgent | null>(this.loadSession());
  agent$ = this.agentSubject.asObservable();

  get currentAgent(): RealEstateAgent | null {
    return this.agentSubject.value;
  }

  get isLoggedIn(): boolean {
    return !!this.currentAgent;
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

  register(fullName: string, agencyName: string, email: string, phone: string, password: string): ActionResult {
    const agents = this.loadAgents();

    if (agents.some(a => a.email.toLowerCase() === email.toLowerCase())) {
      return { success: false, message: 'AGENT_AUTH.ERROR_EMAIL_TAKEN' };
    }

    const agent: StoredAgent = {
      id: this.generateId(),
      fullName,
      agencyName,
      email,
      phone,
      password
    };

    agents.push(agent);
    localStorage.setItem(AGENTS_KEY, JSON.stringify(agents));
    this.setSession(agent);

    return { success: true };
  }

  login(email: string, password: string): ActionResult {
    const agents = this.loadAgents();
    const found = agents.find(a => a.email.toLowerCase() === email.toLowerCase() && a.password === password);

    if (!found) {
      return { success: false, message: 'AGENT_AUTH.ERROR_INVALID_CREDENTIALS' };
    }

    this.setSession(found);
    return { success: true };
  }

  logout(): void {
    localStorage.removeItem(SESSION_KEY);
    this.agentSubject.next(null);
  }

  private loadAgents(): StoredAgent[] {
    const raw = localStorage.getItem(AGENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  }

  private setSession(agent: StoredAgent): void {
    const { password, ...publicAgent } = agent;
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
