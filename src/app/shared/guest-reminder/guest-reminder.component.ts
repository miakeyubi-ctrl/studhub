import { Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription, combineLatest, filter } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { AgentAuthService } from '../../services/agent-auth.service';
import { PartnerAuthService } from '../../services/partner-auth.service';

const HIDDEN_ON_PREFIXES = [
  '/login', '/register', '/forgot-password', '/verify-code', '/reset-password', '/onbroading',
  '/agent-login', '/agent-register', '/agent-dashboard',
  '/partner-login', '/partner-dashboard',
];

@Component({
  selector: 'app-guest-reminder',
  templateUrl: './guest-reminder.component.html',
  styleUrls: ['./guest-reminder.component.scss'],
  standalone: false,
})
export class GuestReminderComponent implements OnInit, OnDestroy {

  isLoggedIn = false;
  onAuthRoute = false;
  dismissed = false;

  private subscriptions = new Subscription();

  constructor(
    private authService: AuthService,
    private agentAuth: AgentAuthService,
    private partnerAuth: PartnerAuthService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.refreshLoginState();
    this.onAuthRoute = this.isAuthRoute(this.router.url);

    this.subscriptions.add(
      combineLatest([
        this.authService.user$,
        this.agentAuth.agent$,
        this.partnerAuth.partner$,
      ]).subscribe(([user, agent, partner]) => {
        this.isLoggedIn = !!user || !!agent || !!partner;
        if (this.isLoggedIn) {
          this.dismissed = false;
        }
      })
    );

    this.subscriptions.add(
      this.router.events.pipe(filter(event => event instanceof NavigationEnd)).subscribe(event => {
        this.onAuthRoute = this.isAuthRoute((event as NavigationEnd).urlAfterRedirects);
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  get visible(): boolean {
    return !this.isLoggedIn && !this.onAuthRoute && !this.dismissed;
  }

  dismiss(): void {
    this.dismissed = true;
  }

  private refreshLoginState(): void {
    this.isLoggedIn =
      this.authService.isLoggedIn ||
      this.agentAuth.isLoggedIn ||
      this.partnerAuth.isLoggedIn;
  }

  private isAuthRoute(url: string): boolean {
    return HIDDEN_ON_PREFIXES.some(prefix => url.startsWith(prefix));
  }
}
