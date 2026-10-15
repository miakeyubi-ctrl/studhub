import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { AgentAuthService } from '../services/agent-auth.service';
import { AgentMenuService } from '../services/agent-menu.service';
import { Conversation, MessagesService } from '../services/messages.service';
import { hasRealAvatar, initialsBg, initialsFromName } from '../utils/avatar.util';

@Component({
  selector: 'app-agent-tab-messages',
  templateUrl: './agent-tab-messages.page.html',
  styleUrls: ['./agent-tab-messages.page.scss'],
  standalone: false,
})
export class AgentTabMessagesPage implements OnInit {

  searchText = '';
  menuInitial = '';
  loading = false;

  constructor(
    private router: Router,
    private location: Location,
    private agentAuth: AgentAuthService,
    private agentMenu: AgentMenuService,
    public messagesService: MessagesService
  ) { }

  ngOnInit() {
    this.updateMenuInitial();
    void this.refresh();
  }

  ionViewWillEnter(): void {
    this.updateMenuInitial();
    void this.refresh();
  }

  private async refresh(): Promise<void> {
    this.loading = true;
    try {
      await this.messagesService.getConversations();
    } finally {
      this.loading = false;
    }
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
    const agent = this.agentAuth.currentAgentOrGuest;
    const label = agent?.agencyName?.trim() || agent?.fullName?.trim() || agent?.email || '';
    this.menuInitial = label ? label.charAt(0).toUpperCase() : '';
  }

  onSearchChange(event: any) {
    this.searchText = event.target.value;
  }

  lastMessageOf(conversation: Conversation): string {
    const last = conversation.messages[conversation.messages.length - 1];
    return last ? last.text : '';
  }

  openConversation(id: number) {
    this.router.navigate(['/messages', id]);
  }

  hasPhoto(c: Conversation): boolean {
    return hasRealAvatar(c.avatar);
  }

  initials(c: Conversation): string {
    return initialsFromName(c.name);
  }

  avatarColor(c: Conversation): string {
    return initialsBg(c.name);
  }

  get filteredConversations(): Conversation[] {
    const term = this.searchText.toLowerCase().trim();

    if (!term) {
      return this.messagesService.conversations;
    }

    return this.messagesService.conversations.filter(c =>
      c.name.toLowerCase().includes(term) ||
      this.lastMessageOf(c).toLowerCase().includes(term)
    );
  }

  get totalUnread(): number {
    return this.messagesService.conversations.reduce((sum, c) => sum + c.unreadCount, 0);
  }
}
