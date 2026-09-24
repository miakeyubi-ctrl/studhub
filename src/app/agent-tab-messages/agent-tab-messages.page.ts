import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Conversation, MessagesService } from '../services/messages.service';

@Component({
  selector: 'app-agent-tab-messages',
  templateUrl: './agent-tab-messages.page.html',
  styleUrls: ['./agent-tab-messages.page.scss'],
  standalone: false,
})
export class AgentTabMessagesPage implements OnInit {

  searchText = '';

  constructor(
    private router: Router,
    public messagesService: MessagesService
  ) { }

  ngOnInit() {
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
