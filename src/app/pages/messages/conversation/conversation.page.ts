import { AfterViewChecked, Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent } from '@ionic/angular';
import { Conversation, MessagesService } from '../../../services/messages.service';

@Component({
  selector: 'app-conversation',
  templateUrl: './conversation.page.html',
  styleUrls: ['./conversation.page.scss'],
  standalone: false,
})
export class ConversationPage implements OnInit, AfterViewChecked {

  @ViewChild(IonContent) ionContent?: IonContent;

  conversation?: Conversation;
  draft = '';

  private shouldScroll = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private messagesService: MessagesService
  ) { }

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.conversation = this.messagesService.getConversation(id);

    if (!this.conversation) {
      this.router.navigateByUrl('/messages');
    }
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  send() {
    const text = this.draft.trim();
    if (!text || !this.conversation) return;

    this.messagesService.sendMessage(this.conversation.id, text);
    this.draft = '';
    this.shouldScroll = true;
  }

  private scrollToBottom(): void {
    this.ionContent?.scrollToBottom(200);
  }
}
