import { Component, OnInit, NgZone } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import Splide from '@splidejs/splide';
import { AuthService } from '../../services/auth.service';
import { CallService } from '../../services/call.service';
import { MockDataService, Review, ServiceProvider } from '../../services/mock-data.service';
import { MessagesService } from '../../services/messages.service';

@Component({
  selector: 'app-detailsstudservices',
  templateUrl: './detailsstudservices.page.html',
  styleUrls: ['./detailsstudservices.page.scss'],
  standalone: false
})
export class DetailsstudservicesPage implements OnInit {

  prestataire?: ServiceProvider;
  loading = true;
  isFavorite = false;
  activeSlide = 0;
  calling = false;

  reviewsList: Review[] = [];
  reviewRating = 5;
  reviewComment = '';
  reviewSending = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private zone: NgZone,
    private messagesService: MessagesService,
    private calls: CallService,
    private toastCtrl: ToastController,
    private translate: TranslateService,
    private auth: AuthService,
    public data: MockDataService
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    void this.load(id);
  }

  private async load(id: number): Promise<void> {
    this.prestataire = this.data.getPrestataireById(id) || await this.data.loadProviderById(id);
    if (this.prestataire) {
      this.isFavorite = !!this.prestataire.isFavorite || this.data.isProviderFavorite(this.prestataire.id);
      void this.loadReviews();
    }
    setTimeout(() => {
      this.loading = false;
      setTimeout(() => this.mountGallery(), 0);
    }, 400);
  }

  private mountGallery(): void {
    if (!this.prestataire) return;

    const splide = new Splide('#service-gallery', {
      type: 'loop',
      perPage: 1,
      arrows: false,
      pagination: false,
      height: '19rem'
    }).mount();

    splide.on('move', (newIndex: number) => {
      this.zone.run(() => this.activeSlide = newIndex);
    });
  }

  async toggleFavorite(): Promise<void> {
    if (!this.prestataire) return;
    this.isFavorite = await this.data.toggleProviderFavorite(this.prestataire.id);
  }

  private async loadReviews(): Promise<void> {
    if (!this.prestataire) return;
    this.reviewsList = await this.data.loadReviews('PROVIDER', this.prestataire.id);
  }

  async submitReview(): Promise<void> {
    if (!this.auth.isLoggedIn) {
      void this.router.navigateByUrl('/login');
      return;
    }
    if (!this.prestataire || !this.reviewComment.trim()) return;
    this.reviewSending = true;
    try {
      await this.data.createReview('PROVIDER', this.prestataire.id, this.reviewRating, this.reviewComment.trim());
      this.reviewComment = '';
      this.reviewRating = 5;
      await this.loadReviews();
    } finally {
      this.reviewSending = false;
    }
  }

  async call(): Promise<void> {
    if (!this.prestataire || this.calling) return;
    this.calling = true;
    try {
      const conversationId = await Promise.resolve(this.messagesService.startConversation({
        name: this.prestataire.name,
        avatar: this.prestataire.images[0] || '',
        role: 'Service · ' + this.prestataire.profession,
        studentId: this.prestataire.userId,
        agentId: this.prestataire.userId ? undefined : this.prestataire.id,
      }));
      const result = await this.calls.startCall(conversationId, this.prestataire.name);
      if (result === 'offline') await this.showToast('CALL.PEER_OFFLINE');
      else if (result === 'no-socket') await this.showToast('CALL.NOT_CONNECTED');
      else if (result === 'busy') await this.showToast('CALL.BUSY');
      else if (result === 'mic-denied') await this.showToast('CALL.MIC_DENIED');
    } catch {
      await this.showToast('CALL.NOT_CONNECTED');
    } finally {
      this.calling = false;
    }
  }

  whatsapp(): void {
    if (this.prestataire) {
      window.open(this.data.whatsappLink(this.prestataire.phone), '_blank');
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
}
