import { Component, OnDestroy, OnInit } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { AgentAuthService } from '../services/agent-auth.service';
import { ActiveRoleService } from '../services/active-role.service';
import { StudentMenuService } from '../services/student-menu.service';
import { LanguageService } from '../services/language.service';
import { ThemeService } from '../services/theme.service';
import { MessagesService } from '../services/messages.service';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  standalone: false,
})
export class TabsPage implements OnInit, OnDestroy {

  displayName: string | null = null;
  subtitle: string | null = null;
  userRole: 'student' | 'agent' | null = null;
  isLoggedIn = false;
  menuOpen = false;
  unreadMessages = 0;

  private sub?: Subscription;
  private agSub?: Subscription;
  private menuSub?: Subscription;
  private msgSub?: Subscription;

  constructor(
    private auth: AuthService,
    private agentAuth: AgentAuthService,
    private activeRole: ActiveRoleService,
    private studentMenu: StudentMenuService,
    private messages: MessagesService,
    private router: Router,
    public language: LanguageService,
    public theme: ThemeService,
  ) {}

  ngOnInit(): void {
    this.activeRole.set('student');
    this.refresh();
    this.sub = this.auth.user$.subscribe(() => this.refresh());
    this.agSub = this.agentAuth.agent$.subscribe(() => this.refresh());
    this.menuSub = this.studentMenu.open$.subscribe((open) => {
      this.menuOpen = open;
    });
    this.unreadMessages = this.messages.totalUnread;
    this.msgSub = this.messages.conversations$.subscribe(() => {
      this.unreadMessages = this.messages.totalUnread;
    });
    void this.messages.getConversations();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.agSub?.unsubscribe();
    this.menuSub?.unsubscribe();
    this.msgSub?.unsubscribe();
  }

  private refresh(): void {
    const student = this.auth.currentUser;
    const agent = this.agentAuth.currentAgent;

    if (student) {
      this.displayName = this.prettyName(student.fullName, student.email);
      this.subtitle = student.university?.trim() || student.email;
      this.userRole = 'student';
      this.isLoggedIn = true;
      return;
    }
    if (agent) {
      this.displayName = this.prettyName(agent.fullName, agent.email);
      this.subtitle = (agent as any).agencyName?.trim() || agent.email;
      this.userRole = 'agent';
      this.isLoggedIn = true;
      return;
    }
    this.displayName = null;
    this.subtitle = null;
    this.userRole = null;
    this.isLoggedIn = false;
  }

  private prettyName(fullName?: string | null, email?: string | null): string {
    if (fullName && fullName.trim()) return fullName.trim();
    if (email) return email.split('@')[0];
    return 'Visiteur';
  }

  openMenu(): void {
    this.studentMenu.open();
  }

  closeMenu(): void {
    this.studentMenu.close();
  }

  goLogin(): void {
    this.closeMenu();
    void this.router.navigateByUrl('/login', { replaceUrl: true });
  }

  logout(): void {
    this.closeMenu();
    if (this.auth.currentUser) this.auth.logout();
    if (this.agentAuth.currentAgent) this.agentAuth.logout();
    void this.router.navigateByUrl('/login', { replaceUrl: true });
  }

  goProfile(): void {
    this.closeMenu();
    void this.router.navigateByUrl('/tabs/tab3');
  }

  goMessages(): void {
    this.closeMenu();
    void this.router.navigateByUrl('/messages');
  }

  goFavorites(): void {
    this.closeMenu();
    void this.router.navigateByUrl('/favorites');
  }

  goFeed(): void {
    this.closeMenu();
    void this.router.navigateByUrl('/tabs/feed');
  }

  goServices(): void {
    this.closeMenu();
    void this.router.navigateByUrl('/tabs/actualites');
  }
}
