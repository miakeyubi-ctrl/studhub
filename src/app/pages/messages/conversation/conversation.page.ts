import { AfterViewChecked, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, ToastController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { ActiveRoleService } from '../../../services/active-role.service';
import { CallService } from '../../../services/call.service';
import { Conversation, MessagesService } from '../../../services/messages.service';
import { UploadService } from '../../../services/upload.service';
import { PushNotificationsService } from '../../../services/push-notifications.service';
import { hasRealAvatar, initialsBg, initialsFromName } from '../../../utils/avatar.util';

@Component({
  selector: 'app-conversation',
  templateUrl: './conversation.page.html',
  styleUrls: ['./conversation.page.scss'],
  standalone: false,
})
export class ConversationPage implements OnInit, OnDestroy, AfterViewChecked {

  @ViewChild(IonContent) ionContent?: IonContent;

  conversation?: Conversation;
  draft = '';
  peerTyping = false;
  uploading = false;
  recording = false;
  recordSeconds = 0;

  /** Prévisualisation image avant envoi */
  showImagePreview = false;
  previewCaption = '';
  previewDataUrl: string | null = null;
  private previewFile: File | null = null;
  private previewObjectUrl: string | null = null;

  private conversationId = 0;
  private shouldScroll = true;
  private sub?: Subscription;
  private typingSub?: Subscription;
  private pollTimer?: ReturnType<typeof setInterval>;
  private typingStopTimer?: ReturnType<typeof setTimeout>;
  private lastMsgCount = 0;
  private wasTyping = false;

  private mediaRecorder?: MediaRecorder;
  private recordChunks: BlobPart[] = [];
  private recordStream?: MediaStream;
  private recordTimer?: ReturnType<typeof setInterval>;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private activeRole: ActiveRoleService,
    private messagesService: MessagesService,
    private calls: CallService,
    private toastCtrl: ToastController,
    private translate: TranslateService,
    private upload: UploadService,
    private push: PushNotificationsService,
  ) { }

  async ngOnInit() {
    this.conversationId = Number(this.route.snapshot.paramMap.get('id'));
    this.conversation = await this.messagesService.getConversation(this.conversationId);

    if (!this.conversation) {
      void this.goBack();
      return;
    }

    this.push.setActiveConversation(this.conversationId);
    this.lastMsgCount = this.conversation.messages?.length || 0;

    this.sub = this.messagesService.conversations$.subscribe((list) => {
      const c = list.find((x) => x.id === this.conversationId);
      if (!c) return;
      const count = c.messages?.length || 0;
      if (count !== this.lastMsgCount) {
        this.lastMsgCount = count;
        this.shouldScroll = true;
      }
      this.conversation = c;
    });

    this.typingSub = this.messagesService.typing$.subscribe((map) => {
      this.peerTyping = !!map[this.conversationId];
      if (this.peerTyping) this.shouldScroll = true;
    });

    await this.messagesService.ensureRealtime();
    this.messagesService.joinConversation(this.conversationId);

    this.pollTimer = setInterval(() => {
      // Ne pas écraser l'UI pendant un enregistrement / upload vocal
      if (this.uploading || this.recording) return;
      void this.messagesService.getConversation(this.conversationId);
    }, 4000);
  }

  ngOnDestroy(): void {
    this.push.setActiveConversation(null);
    this.stopTyping();
    this.cleanupRecording(true);
    this.clearImagePreview();
    this.sub?.unsubscribe();
    this.typingSub?.unsubscribe();
    if (this.pollTimer) clearInterval(this.pollTimer);
    if (this.typingStopTimer) clearTimeout(this.typingStopTimer);
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  trackByMessageId(_index: number, message: { id: number }): number {
    return message.id;
  }

  get statusLabel(): string {
    if (this.peerTyping) return 'MESSAGES_PAGE.TYPING';
    if (this.conversation?.online) return 'MESSAGES_PAGE.ONLINE';
    return '';
  }

  get hasPhoto(): boolean {
    return hasRealAvatar(this.conversation?.avatar);
  }

  get initials(): string {
    return initialsFromName(this.conversation?.name);
  }

  get avatarColor(): string {
    return initialsBg(this.conversation?.name);
  }

  get recordLabel(): string {
    const m = Math.floor(this.recordSeconds / 60);
    const s = this.recordSeconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  onDraftInput(): void {
    if (!this.conversationId) return;
    if (!this.wasTyping) {
      this.wasTyping = true;
      this.messagesService.setTyping(this.conversationId, true);
    }
    if (this.typingStopTimer) clearTimeout(this.typingStopTimer);
    this.typingStopTimer = setTimeout(() => this.stopTyping(), 1200);
  }

  private stopTyping(): void {
    if (!this.wasTyping) return;
    this.wasTyping = false;
    this.messagesService.setTyping(this.conversationId, false);
  }

  goBack(): void {
    this.stopTyping();
    this.cleanupRecording(true);
    if (this.activeRole.preferAgent()) {
      void this.router.navigateByUrl('/agent-dashboard/messages');
      return;
    }
    if (window.history.length > 1) {
      this.location.back();
      return;
    }
    void this.router.navigateByUrl('/messages');
  }

  async send() {
    const text = this.draft.trim();
    if (!text || !this.conversation || this.uploading) return;
    if (this.conversation.isSystem || this.conversation.allowReplies === false) return;

    this.stopTyping();
    this.draft = '';
    this.shouldScroll = true;
    await this.messagesService.sendMessage(this.conversation.id, text);
    this.conversation = this.messagesService.conversations.find((c) => c.id === this.conversationId);
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || !this.conversation) return;

    if (file.type.startsWith('image/')) {
      this.openImagePreview(file);
      return;
    }

    await this.sendMediaFile(file);
  }

  openImagePreview(file: File): void {
    this.clearImagePreview();
    this.previewFile = file;
    this.previewCaption = '';
    this.previewObjectUrl = URL.createObjectURL(file);
    this.previewDataUrl = this.previewObjectUrl;
    this.showImagePreview = true;
  }

  closeImagePreview(): void {
    this.clearImagePreview();
  }

  async confirmSendImage(): Promise<void> {
    if (!this.previewFile || !this.conversation) return;
    const file = this.previewFile;
    const caption = this.previewCaption.trim();
    this.clearImagePreview();
    await this.sendMediaFile(file, false, caption);
  }

  private clearImagePreview(): void {
    this.showImagePreview = false;
    this.previewCaption = '';
    this.previewFile = null;
    this.previewDataUrl = null;
    if (this.previewObjectUrl) {
      URL.revokeObjectURL(this.previewObjectUrl);
      this.previewObjectUrl = null;
    }
  }

  async toggleRecording(): Promise<void> {
    if (this.uploading) return;
    if (this.recording) {
      await this.stopRecordingAndSend();
      return;
    }
    await this.startRecording();
  }

  cancelRecording(): void {
    this.cleanupRecording(true);
  }

  private async startRecording(): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      await this.showToast('CONVERSATION_PAGE.VOICE_UNSUPPORTED');
      return;
    }
    try {
      this.recordStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });
      const mime = this.pickAudioMime();
      this.recordChunks = [];
      this.mediaRecorder = mime
        ? new MediaRecorder(this.recordStream, { mimeType: mime, audioBitsPerSecond: 64000 })
        : new MediaRecorder(this.recordStream);

      this.mediaRecorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) this.recordChunks.push(ev.data);
      };

      // Sans timeslice : un seul blob valide (évite lecture trop rapide)
      this.mediaRecorder.start();
      this.recording = true;
      this.recordSeconds = 0;
      this.recordTimer = setInterval(() => {
        this.recordSeconds += 1;
        if (this.recordSeconds >= 120) {
          void this.stopRecordingAndSend();
        }
      }, 1000);
    } catch {
      this.cleanupRecording(true);
      await this.showToast('CONVERSATION_PAGE.VOICE_MIC_DENIED');
    }
  }

  private async stopRecordingAndSend(): Promise<void> {
    if (!this.mediaRecorder || !this.recording) {
      this.cleanupRecording(true);
      return;
    }

    const mime = this.mediaRecorder.mimeType || 'audio/webm';
    const blob: Blob = await new Promise((resolve) => {
      const rec = this.mediaRecorder!;
      rec.onstop = () => {
        resolve(new Blob(this.recordChunks, { type: mime }));
      };
      try {
        if (rec.state === 'recording') {
          try { rec.requestData(); } catch {}
        }
        rec.stop();
      } catch {
        resolve(new Blob([], { type: mime }));
      }
    });

    const seconds = this.recordSeconds;
    this.cleanupRecording(false);

    if (!blob.size || seconds < 1) {
      await this.showToast('CONVERSATION_PAGE.VOICE_TOO_SHORT');
      return;
    }

    const ext = mime.includes('ogg') ? 'ogg' : mime.includes('mp4') ? 'm4a' : 'webm';
    const file = new File([blob], `voice-${Date.now()}.${ext}`, { type: mime });
    // Affiche tout de suite la note (blob local) pendant l'upload
    await this.sendVoiceWithPreview(file, blob);
  }

  /** Optimistic : bulle visible immédiatement, puis URL serveur. */
  private async sendVoiceWithPreview(file: File, blob: Blob): Promise<void> {
    if (!this.conversation) return;
    this.uploading = true;
    this.stopTyping();
    this.shouldScroll = true;

    const localUrl = URL.createObjectURL(blob);
    const tempId = Date.now();
    this.messagesService.appendOptimisticMedia(this.conversation.id, {
      id: tempId,
      kind: 'audio',
      mediaUrl: localUrl,
      text: '🎤 Note vocale',
    });
    this.conversation = this.messagesService.conversations.find((c) => c.id === this.conversationId);

    try {
      const uploaded = await this.upload.uploadFile(file, 'chat');
      await this.messagesService.sendMessage(
        this.conversation!.id,
        '🎤 Note vocale',
        uploaded.url,
        { replaceTempId: tempId, revokeUrl: localUrl, forceKind: 'audio' },
      );
      this.conversation = this.messagesService.conversations.find((c) => c.id === this.conversationId);
    } catch {
      this.messagesService.removeOptimistic(this.conversationId, tempId);
      try { URL.revokeObjectURL(localUrl); } catch {}
      await this.showToast('CONVERSATION_PAGE.MEDIA_SEND_FAILED');
    } finally {
      this.uploading = false;
    }
  }

  private async sendMediaFile(file: File, isVoice = false, caption = ''): Promise<void> {
    if (!this.conversation) return;
    this.uploading = true;
    this.stopTyping();
    try {
      const uploaded = await this.upload.uploadFile(file, 'chat');
      const kind = this.messagesService.mediaKindFromUrl(uploaded.url);
      const label =
        isVoice || kind === 'audio'
          ? ''
          : kind === 'image'
            ? caption
            : (caption || file.name);
      this.shouldScroll = true;
      await this.messagesService.sendMessage(this.conversation.id, label, uploaded.url);
      this.conversation = this.messagesService.conversations.find((c) => c.id === this.conversationId);
    } catch {
      await this.showToast('CONVERSATION_PAGE.MEDIA_SEND_FAILED');
    } finally {
      this.uploading = false;
    }
  }

  private pickAudioMime(): string {
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
      'audio/aac',
    ];
    for (const c of candidates) {
      if (MediaRecorder.isTypeSupported?.(c)) return c;
    }
    return '';
  }

  private cleanupRecording(discard: boolean): void {
    if (this.recordTimer) {
      clearInterval(this.recordTimer);
      this.recordTimer = undefined;
    }
    try {
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.ondataavailable = null;
        this.mediaRecorder.onstop = null;
        if (discard) this.mediaRecorder.stop();
      }
    } catch {}
    this.mediaRecorder = undefined;
    this.recordChunks = [];
    if (this.recordStream) {
      this.recordStream.getTracks().forEach((t) => t.stop());
      this.recordStream = undefined;
    }
    this.recording = false;
    this.recordSeconds = 0;
  }

  async startCall(): Promise<void> {
    if (!this.conversation) return;

    if (!this.conversation.online && !this.messagesService.isPeerOnline(this.conversation.id)) {
      await this.showToast('CALL.PEER_OFFLINE');
      return;
    }

    const result = await this.calls.startCall(this.conversation.id, this.conversation.name);
    if (result === 'offline') {
      await this.showToast('CALL.PEER_OFFLINE');
      return;
    }
    if (result === 'no-socket') {
      await this.showToast('CALL.NOT_CONNECTED');
      return;
    }
    if (result === 'busy') {
      await this.showToast('CALL.BUSY');
      return;
    }
    if (result === 'mic-denied') {
      await this.showToast('CALL.MIC_DENIED');
    }
  }

  private async showToast(key: string): Promise<void> {
    const toast = await this.toastCtrl.create({
      message: this.translate.instant(key),
      duration: 2500,
      position: 'top',
      color: 'medium',
    });
    await toast.present();
  }

  private scrollToBottom(): void {
    this.ionContent?.scrollToBottom(200);
  }
}
