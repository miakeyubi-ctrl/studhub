import { Component, OnDestroy, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AgentAuthService, RealEstateAgent } from '../services/agent-auth.service';
import { AgentMenuService } from '../services/agent-menu.service';
import { AgentProperty, AgentPropertiesService } from '../services/agent-properties.service';
import { MessagesService } from '../services/messages.service';

@Component({
  selector: 'app-agent-tab-dashboard',
  templateUrl: './agent-tab-dashboard.page.html',
  styleUrls: ['./agent-tab-dashboard.page.scss'],
  standalone: false,
})
export class AgentTabDashboardPage implements OnInit, OnDestroy {

  agent!: RealEstateAgent;
  properties: AgentProperty[] = [];
  unreadMessages = 0;
  menuInitial = '';
  private sub?: Subscription;

  constructor(
    private agentAuth: AgentAuthService,
    public agentProperties: AgentPropertiesService,
    private messagesService: MessagesService,
    private agentMenu: AgentMenuService,
    private location: Location,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.agent = this.agentAuth.currentAgentOrGuest;
    this.updateMenuInitial();
    this.sub = this.agentAuth.agent$.subscribe(a => {
      this.agent = a || this.agentAuth.currentAgentOrGuest;
      this.updateMenuInitial();
      void this.refreshProperties();
    });
    void this.agentAuth.hydrateFromApi();
    void this.refreshProperties();
    void this.refreshUnread();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  ionViewWillEnter(): void {
    void this.refreshProperties();
    void this.refreshUnread();
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

  private async refreshUnread(): Promise<void> {
    await this.messagesService.getConversations();
    this.unreadMessages = this.messagesService.conversations.reduce((sum, c) => sum + c.unreadCount, 0);
  }

  private async refreshProperties(): Promise<void> {
    this.properties = await this.agentProperties.getByAgent(this.agent.id);
  }

  get recentProperties(): AgentProperty[] {
    return this.properties.slice(0, 3);
  }

  viewProperty(property: AgentProperty): void {
    void this.router.navigate(['/detailsimmo', property.id]);
  }
}
