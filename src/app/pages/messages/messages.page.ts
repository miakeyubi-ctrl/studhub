import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { ActiveRoleService } from '../../services/active-role.service';
import { Conversation, MessagesService } from '../../services/messages.service';
import { hasRealAvatar, initialsBg, initialsFromName } from '../../utils/avatar.util';

@Component({
  selector: 'app-messages',
  templateUrl: './messages.page.html',
  styleUrls: ['./messages.page.scss'],
  standalone: false,
})
export class MessagesPage implements OnInit {

  loading = true;
  searchText = '';

  constructor(
    private router: Router,
    private location: Location,
    private activeRole: ActiveRoleService,
    public messagesService: MessagesService
  ) { }

  ngOnInit() {
    void this.refresh();
  }

  ionViewWillEnter(): void {
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

  goBack(): void {
    if (this.activeRole.preferAgent()) {
      void this.router.navigateByUrl('/agent-dashboard/dashboard');
      return;
    }
    if (window.history.length > 1) {
      this.location.back();
      return;
    }
    void this.router.navigateByUrl('/tabs/tab3');
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
