import { Component, OnInit } from '@angular/core';
import { AgentAuthService, RealEstateAgent } from '../services/agent-auth.service';
import { AgentProperty, AgentPropertiesService } from '../services/agent-properties.service';
import { MessagesService } from '../services/messages.service';

@Component({
  selector: 'app-agent-tab-dashboard',
  templateUrl: './agent-tab-dashboard.page.html',
  styleUrls: ['./agent-tab-dashboard.page.scss'],
  standalone: false,
})
export class AgentTabDashboardPage implements OnInit {

  agent!: RealEstateAgent;
  properties: AgentProperty[] = [];
  unreadMessages = 0;

  constructor(
    private agentAuth: AgentAuthService,
    private agentProperties: AgentPropertiesService,
    private messagesService: MessagesService
  ) {}

  ngOnInit(): void {
    this.agent = this.agentAuth.currentAgentOrGuest;
    this.properties = this.agentProperties.getByAgent(this.agent.id);
    this.unreadMessages = this.messagesService.conversations.reduce((sum, c) => sum + c.unreadCount, 0);
  }

  ionViewWillEnter(): void {
    this.properties = this.agentProperties.getByAgent(this.agent.id);
  }

  get recentProperties(): AgentProperty[] {
    return this.properties.slice(0, 3);
  }
}
