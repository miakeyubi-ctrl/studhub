import { Component, OnDestroy, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AgentAuthService, RealEstateAgent } from '../services/agent-auth.service';
import { AgentMenuService } from '../services/agent-menu.service';
import { LanguageService } from '../services/language.service';
import { ThemeService } from '../services/theme.service';

@Component({
  selector: 'app-agent-tab-profile',
  templateUrl: './agent-tab-profile.page.html',
  styleUrls: ['./agent-tab-profile.page.scss'],
  standalone: false,
})
export class AgentTabProfilePage implements OnInit, OnDestroy {

  agent!: RealEstateAgent;
  menuInitial = '';
  private sub?: Subscription;

  constructor(
    private router: Router,
    private location: Location,
    private agentAuth: AgentAuthService,
    private agentMenu: AgentMenuService,
    public language: LanguageService,
    public theme: ThemeService
  ) { }

  ngOnInit() {
    this.agent = this.agentAuth.currentAgentOrGuest;
    this.updateMenuInitial();
    this.sub = this.agentAuth.agent$.subscribe(a => {
      this.agent = a || this.agentAuth.currentAgentOrGuest;
      this.updateMenuInitial();
    });
    void this.agentAuth.hydrateFromApi();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  openMenu(): void {
    this.agentMenu.open();
  }

  goBack(): void {
    if (window.history.length > 1) {
      this.location.back();
      return;
    }
    void this.router.navigateByUrl('/agent-dashboard/dashboard');
  }

  private updateMenuInitial(): void {
    const label = this.agent?.agencyName?.trim() || this.agent?.fullName?.trim() || this.agent?.email || '';
    this.menuInitial = label ? label.charAt(0).toUpperCase() : '';
  }

  logout(): void {
    this.agentAuth.logout();
    void this.router.navigateByUrl('/agent-login', { replaceUrl: true });
  }
}
