import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { AgentAuthService } from '../services/agent-auth.service';
import { AgentMenuService } from '../services/agent-menu.service';
import { ActiveRoleService } from '../services/active-role.service';
import { LanguageService } from '../services/language.service';
import { ThemeService } from '../services/theme.service';

@Component({
  selector: 'app-agent-tabs',
  templateUrl: 'agent-tabs.page.html',
  styleUrls: ['agent-tabs.page.scss'],
  standalone: false,
})
export class AgentTabsPage implements OnInit, OnDestroy {

  displayName: string | null = null;
  subtitle: string | null = null;
  menuOpen = false;

  private sub?: Subscription;
  private agSub?: Subscription;
  private menuSub?: Subscription;

  constructor(
    private auth: AuthService,
    private agentAuth: AgentAuthService,
    private agentMenu: AgentMenuService,
    private activeRole: ActiveRoleService,
    private router: Router,
    public language: LanguageService,
    public theme: ThemeService,
  ) {}

  ngOnInit(): void {
    this.activeRole.set('agent');
    this.refresh();
    this.sub = this.auth.user$.subscribe(() => this.refresh());
    this.agSub = this.agentAuth.agent$.subscribe(() => this.refresh());
    this.menuSub = this.agentMenu.open$.subscribe(open => {
      this.menuOpen = open;
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.agSub?.unsubscribe();
    this.menuSub?.unsubscribe();
  }

  private refresh(): void {
    const agent = this.agentAuth.currentAgent;
    if (agent) {
      const agency = agent.agencyName?.trim() || '';
      const name = this.prettyName(agent.fullName, agent.email);
      this.displayName = agency || name;
      this.subtitle = agency && agency !== name ? name : (agent.email || '');
      return;
    }
    const student = this.auth.currentUser;
    if (student) {
      this.displayName = this.prettyName(student.fullName, student.email);
      this.subtitle = (student as any).university?.trim() || student.email;
      return;
    }
    this.displayName = null;
    this.subtitle = null;
  }

  private prettyName(fullName?: string | null, email?: string | null): string {
    if (fullName && fullName.trim()) return fullName.trim();
    if (email) return email.split('@')[0];
    return 'Visiteur';
  }

  closeMenu(): void {
    this.agentMenu.close();
  }

  goProfile(): void {
    this.closeMenu();
    void this.router.navigateByUrl('/agent-dashboard/profil');
  }

  goMessages(): void {
    this.closeMenu();
    void this.router.navigateByUrl('/agent-dashboard/messages');
  }

  logout(): void {
    this.closeMenu();
    if (this.auth.currentUser) this.auth.logout();
    if (this.agentAuth.currentAgent) this.agentAuth.logout();
    void this.router.navigateByUrl('/agent-login', { replaceUrl: true });
  }
}
