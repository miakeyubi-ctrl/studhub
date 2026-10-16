import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MockDataService, Property, Review } from '../../services/mock-data.service';
import { MessagesService } from '../../services/messages.service';
import { AgentAuthService } from '../../services/agent-auth.service';
import { AuthService } from '../../services/auth.service';
import { CallService } from '../../services/call.service';
import { AgentFollowService } from '../../services/agent-follow.service';
import { ReservationsService } from '../../services/reservations.service';

@Component({
  selector: 'app-detailsimmo',
  templateUrl: './detailsimmo.page.html',
  styleUrls: ['./detailsimmo.page.scss'],
  standalone: false
})
export class DetailsimmoPage implements OnInit {

  property?: Property;
  loading = true;
  notFound = false;
  isFavorite = false;
  isLiked = false;
  isOwner = false;
  calling = false;
  followingAgent = false;
  followBusy = false;
  similarProperties: Property[] = [];
  publisherListings: Property[] = [];
  mapUrl: SafeResourceUrl | null = null;
  mapCityLabel = '';
  private mapReq = 0;

  reviewsList: Review[] = [];
  reviewRating = 5;
  reviewComment = '';
  reviewSending = false;
  reportBusy = false;
  reserving = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private sanitizer: DomSanitizer,
    private messagesService: MessagesService,
    private calls: CallService,
    private agentAuth: AgentAuthService,
    private auth: AuthService,
    private followService: AgentFollowService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private translate: TranslateService,
    private http: HttpClient,
    public data: MockDataService,
    private reservationsApi: ReservationsService,
  ) {}

  async ngOnInit(): Promise<void> {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id || Number.isNaN(id)) {
      this.notFound = true;
      this.loading = false;
      return;
    }

    this.property = await this.data.loadPropertyById(id);
    this.notFound = !this.property;
    this.isFavorite = !!this.property?.isFavorite || this.data.isFavorite(id);
    this.isLiked = !!this.property?.likedByMe || this.data.isPropertyLiked(id);
    this.isOwner = this.checkIsOwner(this.property);
    this.loading = false;

    if (this.property) {
      void this.updateMap(this.property.city || this.property.address);
      this.loadSimilar(this.property);
      void this.refreshFollowStatus();
      void this.loadReviews();
    }
  }

  private async loadReviews(): Promise<void> {
    if (!this.property) return;
    this.reviewsList = await this.data.loadReviews('PROPERTY', this.property.id);
  }

  async submitReview(): Promise<void> {
    if (!this.auth.currentUser && !this.agentAuth.currentAgent) {
      void this.router.navigateByUrl('/login');
      return;
    }
    if (!this.property || !this.reviewComment.trim()) return;
    this.reviewSending = true;
    try {
      await this.data.createReview('PROPERTY', this.property.id, this.reviewRating, this.reviewComment.trim());
      this.reviewComment = '';
      this.reviewRating = 5;
      await this.loadReviews();
    } finally {
      this.reviewSending = false;
    }
  }

  get publisherAgentId(): number {
    if (!this.property) return 0;
    return this.property.agentId || Number(this.property.publisher?.id ?? 0) || 0;
  }

  private async refreshFollowStatus(): Promise<void> {
    const agentId = this.publisherAgentId;
    if (!agentId || this.isOwner) {
      this.followingAgent = false;
      return;
    }
    if (!this.auth.currentUser && !this.agentAuth.currentAgent) {
      this.followingAgent = false;
      return;
    }
    const status = await this.followService.getStatus(agentId);
    this.followingAgent = !!status.following;
  }

  async toggleFollowAlerts(): Promise<void> {
    const agentId = this.publisherAgentId;
    if (!agentId || this.isOwner || this.followBusy) return;

    if (!this.auth.currentUser && !this.agentAuth.currentAgent) {
      await this.showToast('DETAILS_IMMO.FOLLOW_LOGIN');
      void this.router.navigateByUrl('/login');
      return;
    }

    if (this.followingAgent) {
      this.followBusy = true;
      try {
        await this.followService.unfollow(agentId);
        this.followingAgent = false;
        await this.showToast('DETAILS_IMMO.FOLLOW_STOPPED');
      } finally {
        this.followBusy = false;
      }
      return;
    }

    const name = this.property?.publisher?.name || 'cet utilisateur';
    const alert = await this.alertCtrl.create({
      header: this.translate.instant('DETAILS_IMMO.FOLLOW_ASK_TITLE'),
      message: this.translate.instant('DETAILS_IMMO.FOLLOW_ASK_MESSAGE', { name }),
      buttons: [
        {
          text: this.translate.instant('DETAILS_IMMO.FOLLOW_NO'),
          role: 'cancel',
        },
        {
          text: this.translate.instant('DETAILS_IMMO.FOLLOW_YES'),
          handler: () => {
            void this.confirmFollow(agentId);
          },
        },
      ],
    });
    await alert.present();
  }

  private async confirmFollow(agentId: number): Promise<void> {
    this.followBusy = true;
    try {
      await this.followService.follow(agentId);
      this.followingAgent = true;
      await this.showToast('DETAILS_IMMO.FOLLOW_SUCCESS');
    } finally {
      this.followBusy = false;
    }
  }

  openAgentProfile(): void {
    const id = this.publisherAgentId;
    if (!id) return;
    void this.router.navigate(['/agent-profile', id]);
  }

  async reportListing(): Promise<void> {
    if (!this.property || this.isOwner || this.reportBusy) return;
    if (!this.auth.currentUser) {
      await this.showToast('REPORT.LOGIN');
      void this.router.navigateByUrl('/login');
      return;
    }

    const alert = await this.alertCtrl.create({
      header: this.translate.instant('REPORT.TITLE'),
      message: this.translate.instant('REPORT.MESSAGE'),
      inputs: [
        { type: 'radio', label: this.translate.instant('REPORT.REASON_SCAM'), value: 'scam', checked: true },
        { type: 'radio', label: this.translate.instant('REPORT.REASON_FAKE'), value: 'fake' },
        { type: 'radio', label: this.translate.instant('REPORT.REASON_SPAM'), value: 'spam' },
        { type: 'radio', label: this.translate.instant('REPORT.REASON_WRONG'), value: 'wrong_info' },
        { type: 'radio', label: this.translate.instant('REPORT.REASON_OTHER'), value: 'other' },
      ],
      buttons: [
        { text: this.translate.instant('COMMON.CANCEL'), role: 'cancel' },
        {
          text: this.translate.instant('REPORT.SUBMIT'),
          handler: (reason: string) => {
            void this.submitReport(reason || 'other');
          },
        },
      ],
    });
    await alert.present();
  }

  private async submitReport(reason: string): Promise<void> {
    if (!this.property) return;
    this.reportBusy = true;
    try {
      const res: any = await firstValueFrom(
        this.http.post(`${environment.apiUrl}/reports`, {
          targetType: 'PROPERTY',
          targetId: this.property.id,
          reason,
        }),
      );
      if (res?.success === false) {
        throw new Error(res?.message || 'error');
      }
      await this.showToast('REPORT.SUCCESS');
    } catch (e: any) {
      if (e?.status === 409) {
        await this.showToast('REPORT.ALREADY');
      } else {
        await this.showToast('REPORT.ERROR');
      }
    } finally {
      this.reportBusy = false;
    }
  }

  private loadSimilar(property: Property): void {
    const agentId = property.agentId || Number(property.publisher?.id ?? 0) || 0;
    const pubName = (property.publisher?.name || '').trim().toLowerCase();
    const generic = new Set(['', 'vendeur', 'agent', 'inconnu', 'publisher']);

    this.publisherListings = this.data.properties.filter((p) => {
      if (p.id === property.id) return false;
      if (agentId && (p.agentId === agentId || Number(p.publisher?.id) === agentId)) return true;
      if (!pubName || generic.has(pubName)) return false;
      const other = (p.publisher?.name || '').trim().toLowerCase();
      if (!other || generic.has(other)) return false;
      return other === pubName;
    }).slice(0, 8);

    const publisherIds = new Set(this.publisherListings.map((p) => p.id));
    const catalog = this.data.properties.filter((p) => p.id !== property.id);
    const sameCat = catalog.filter(
      (p) => !publisherIds.has(p.id) && p.category === property.category,
    );
    const others = catalog.filter((p) => !publisherIds.has(p.id));

    const seen = new Set<number>();
    const out: Property[] = [];
    for (const p of [...sameCat, ...others, ...catalog]) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      out.push(p);
      if (out.length >= 4) break;
    }
    this.similarProperties = out;
  }

  private async updateMap(city: string): Promise<void> {
    const label = (city || '').trim() || 'Tunisie';
    this.mapCityLabel = label;
    const req = ++this.mapReq;

    const gq = encodeURIComponent(label.includes('Tunisie') ? label : `${label}, Tunisie`);
    this.mapUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://maps.google.com/maps?q=${gq}&hl=fr&gl=fr&ie=UTF8&z=13&output=embed`,
    );

    try {
      const q = encodeURIComponent(`${label}, Tunisie`);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&accept-language=fr`,
        { headers: { Accept: 'application/json', 'Accept-Language': 'fr' } },
      );
      if (!res.ok || req !== this.mapReq) return;
      const data = await res.json();
      const hit = Array.isArray(data) ? data[0] : null;
      if (!hit?.lat || !hit?.lon || req !== this.mapReq) return;
      const lat = Number(hit.lat);
      const lon = Number(hit.lon);
      this.mapUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
        `https://maps.google.com/maps?q=${lat},${lon}&hl=fr&gl=fr&ie=UTF8&z=14&output=embed`,
      );
    } catch {
      /* garder Google */
    }
  }

  openExternalMap(): void {
    const city = (this.mapCityLabel || this.property?.city || 'Tunisie').trim();
    const q = encodeURIComponent(city.includes('Tunisie') ? city : `${city}, Tunisie`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${q}&hl=fr`, '_blank');
  }

  openNearbyListings(): void {
    if (!this.property) return;
    const city = (this.mapCityLabel || this.property.city || '').trim();
    void this.router.navigate(['/nearby'], {
      queryParams: {
        kind: 'immo',
        city,
        exclude: this.property.id,
      },
    });
  }

  openProperty(id: number): void {
    if (!id) return;
    void this.router.navigate(['/detailsimmo', id]);
  }

  private checkIsOwner(property?: Property): boolean {
    const agent = this.agentAuth.currentAgent;
    if (!agent || !property) return false;
    const agentId = String(agent.id);
    const propertyAgentId = String(property.agentId ?? property.publisher?.id ?? '');
    return !!propertyAgentId && propertyAgentId === agentId;
  }

  editProperty(): void {
    if (!this.property) return;
    void this.router.navigate(['/agent-dashboard/gestion'], {
      queryParams: { edit: this.property.id },
    });
  }

  goBack(): void {
    if (window.history.length > 1) {
      this.location.back();
      return;
    }
    void this.router.navigateByUrl(this.isOwner ? '/agent-dashboard/gestion' : '/tabs/tab2');
  }

  async toggleFavorite(): Promise<void> {
    if (!this.property) return;
    this.isFavorite = await this.data.toggleFavorite(this.property.id);
    this.property.isFavorite = this.isFavorite;
  }

  async toggleLike(): Promise<void> {
    if (!this.property) return;
    const res = await this.data.togglePropertyLike(this.property.id);
    this.isLiked = res.liked;
    this.property.likedByMe = res.liked;
    this.property.likesCount = res.likesCount;
  }

  formatPhone(phone?: string): string {
    const raw = (phone || '').replace(/\s+/g, '');
    if (!raw) return '';
    if (raw.startsWith('+')) return phone!.trim();
    if (raw.startsWith('216')) return `+${raw}`;
    return `+216 ${phone!.trim()}`;
  }

  call(): void {
    void this.startAppCall();
  }

  private async startAppCall(): Promise<void> {
    if (!this.property || this.calling || this.isOwner) return;

    if (!this.auth.currentUser) {
      await this.showToast('CALL.LOGIN_REQUIRED');
      void this.router.navigateByUrl('/login');
      return;
    }

    const agentId = this.property.agentId ?? (Number(this.property.publisher?.id ?? 0) || undefined);
    if (!agentId) {
      await this.showToast('CALL.NOT_CONNECTED');
      return;
    }

    this.calling = true;
    try {
      const conversationId = await this.messagesService.startConversation({
        name: this.property.publisher.name,
        avatar: this.property.publisher.image,
        role: 'Agent · ' + this.property.title,
        agentId,
      });
      const result = await this.calls.startCall(conversationId, this.property.publisher.name);
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

  async reserve(): Promise<void> {
    if (!this.property || this.reserving) return;
    if (!this.auth.currentUser) {
      await this.showToast('DETAILS.RESERVE_NEED_LOGIN');
      void this.router.navigateByUrl('/login');
      return;
    }
    this.reserving = true;
    try {
      await this.reservationsApi.create(this.property.id);
      await this.showToast('DETAILS.RESERVE_OK');
    } catch {
      await this.showToast('DETAILS.RESERVE_ERROR');
    } finally {
      this.reserving = false;
    }
  }

  async converser(): Promise<void> {
    if (!this.property) return;

    if (!this.auth.currentUser) {
      const t = await this.toastCtrl.create({
        message: 'Connectez-vous en tant qu’étudiant pour envoyer un message.',
        duration: 2800,
        color: 'warning',
        position: 'top',
      });
      await t.present();
      void this.router.navigateByUrl('/login');
      return;
    }

    const agentId = this.property.agentId ?? (Number(this.property.publisher?.id ?? 0) || undefined);
    if (!agentId) {
      const t = await this.toastCtrl.create({
        message: 'Impossible de contacter cet agent pour le moment.',
        duration: 2500,
        color: 'danger',
        position: 'top',
      });
      await t.present();
      return;
    }

    try {
      const conversationId = await this.messagesService.startConversation({
        name: this.property.publisher.name,
        avatar: this.property.publisher.image,
        role: 'Agent · ' + this.property.title,
        agentId,
      });
      void this.router.navigate(['/messages', conversationId]);
    } catch {
      const t = await this.toastCtrl.create({
        message: 'Échec de l’ouverture de la conversation. Réessayez.',
        duration: 2800,
        color: 'danger',
        position: 'top',
      });
      await t.present();
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
