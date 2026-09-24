import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AgentAuthService, RealEstateAgent } from '../services/agent-auth.service';
import { LanguageService } from '../services/language.service';
import { ThemeService } from '../services/theme.service';

@Component({
  selector: 'app-agent-tab-profile',
  templateUrl: './agent-tab-profile.page.html',
  styleUrls: ['./agent-tab-profile.page.scss'],
  standalone: false,
})
export class AgentTabProfilePage implements OnInit {

  agent!: RealEstateAgent;

  constructor(
    private router: Router,
    private agentAuth: AgentAuthService,
    public language: LanguageService,
    public theme: ThemeService
  ) { }

  ngOnInit() {
    this.agent = this.agentAuth.currentAgentOrGuest;
  }

  logout(): void {
    this.agentAuth.logout();
    this.router.navigateByUrl('/tabs/tab3');
  }
}
