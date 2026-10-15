import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AgentFollowService } from '../../services/agent-follow.service';
import { AuthService } from '../../services/auth.service';
import { AgentAuthService } from '../../services/agent-auth.service';
import { MockDataService, Property } from '../../services/mock-data.service';
import { MessagesService } from '../../services/messages.service';
import { CallService } from '../../services/call.service';

export interface PublicAgentProfile {
  id: number;
  agencyName: string;
  phone?: string;
  address?: string;
  verified?: boolean;
  description?: string;
  avatarUrl?: string;
  createdAt?: string;
  followersCount: number;
  listingsCount: number;
}

const DEFAULT_AVATAR =
  'https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=200&auto=format&fit=crop';

@Component({
  selector: 'app-agent-profile',
  templateUrl: './agent-profile.page.html',
  styleUrls: ['./agent-profile.page.scss'],
  standalone: false,
})
export class AgentProfilePage implements OnInit {
  loading = true;
  notFound = false;
  agent?: PublicAgentProfile;
  listings: Property[] = [];
  following = false;
  followBusy = false;
  isOwnProfile = false;
  calling = false;
  peerOnline: boolean | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private http: HttpClient,
    private followService: AgentFollowService,
    private auth: AuthService,
    private agentAuth: AgentAuthService,
    private data: MockDataService,
    private messages: MessagesService,
    private calls: CallService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private translate: TranslateService,
  ) {}

  async ngOnInit(): Promise<void> {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id || Number.isNaN(id)) {
      this.notFound = true;
      this.loading = false;
      return;
    }
    await this.load(id);
  }

  get avatar(): string {
    return this.agent?.avatarUrl || DEFAULT_AVATAR;
  }

  get createdLabel(): string {
    if (!this.agent?.createdAt) return '—';
    try {
      return new Date(this.agent.createdAt).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return String(this.agent.createdAt);
    }
  }

  goBack(): void {
    if (window.history.length > 1) {
      this.location.back();
      return;
    }
    void this.router.navigateByUrl('/tabs/tab2');
  }

  openListing(id: number): void {
    void this.router.navigate(['/detailsimmo', id]);
  }

  async call(): Promise<void> {
    if (!this.agent || this.calling || this.isOwnProfile) return;
    if (!this.auth.currentUser) {
      await this.toast('CALL.LOGIN_REQUIRED');
      void this.router.navigateByUrl('/login');
      return;
    }
    this.calling = true;
    try {
      const conversationId = await this.ensureConversation();
      const result = await this.calls.startCall(conversationId, this.agent.agencyName);
      this.peerOnline = this.messages.isPeerOnline(conversationId);
      if (result === 'offline') await this.toast('CALL.PEER_OFFLINE');
      else if (result === 'no-socket') await this.toast('CALL.NOT_CONNECTED');
      else if (result === 'busy') await this.toast('CALL.BUSY');
      else if (result === 'mic-denied') await this.toast('CALL.MIC_DENIED');
    } catch {
      await this.toast('CALL.NOT_CONNECTED');
    } finally {
      this.calling = false;
    }
  }

  async converser(): Promise<void> {
    if (!this.agent || this.isOwnProfile) return;
    if (!this.auth.currentUser) {
      await this.toast('CALL.LOGIN_REQUIRED');
      void this.router.navigateByUrl('/login');
      return;
    }
    try {
      const conversationId = await this.ensureConversation();
      void this.messages.waitForPeerPresence(conversationId, 2000).then((ok) => {
        this.peerOnline = ok;
      });
      void this.router.navigate(['/messages', conversationId]);
    } catch {
      await this.toast('CALL.NOT_CONNECTED');
    }
  }

  private ensureConversation(): Promise<number> {
    if (!this.agent) return Promise.reject();
    return this.messages.startConversation({
      name: this.agent.agencyName,
      avatar: this.avatar,
      role: 'Agent immobilier',
      agentId: this.agent.id,
    });
  }

  async toggleFollow(): Promise<void> {
    if (!this.agent || this.isOwnProfile || this.followBusy) return;

    if (!this.auth.currentUser && !this.agentAuth.currentAgent) {
      await this.toast('AGENT_PROFILE.FOLLOW_LOGIN');
      void this.router.navigateByUrl('/login');
      return;
    }

    if (this.following) {
      this.followBusy = true;
      try {
        const res = await this.followService.unfollow(this.agent.id);
        this.following = false;
        if (typeof res.followersCount === 'number') {
          this.agent.followersCount = res.followersCount;
        } else {
          this.agent.followersCount = Math.max(0, (this.agent.followersCount || 1) - 1);
        }
        await this.toast('AGENT_PROFILE.FOLLOW_STOPPED');
      } finally {
        this.followBusy = false;
      }
      return;
    }

    const name = this.agent.agencyName || 'cet utilisateur';
    const alert = await this.alertCtrl.create({
      header: this.translate.instant('AGENT_PROFILE.FOLLOW_ASK_TITLE'),
      message: this.translate.instant('AGENT_PROFILE.FOLLOW_ASK_MESSAGE', { name }),
      buttons: [
        { text: this.translate.instant('AGENT_PROFILE.FOLLOW_NO'), role: 'cancel' },
        {
          text: this.translate.instant('AGENT_PROFILE.FOLLOW_YES'),
          handler: () => { void this.confirmFollow(); },
        },
      ],
    });
    await alert.present();
  }

  private async confirmFollow(): Promise<void> {
    if (!this.agent) return;
    this.followBusy = true;
    try {
      const res = await this.followService.follow(this.agent.id);
      this.following = true;
      if (typeof res.followersCount === 'number') {
        this.agent.followersCount = res.followersCount;
      } else {
        this.agent.followersCount = (this.agent.followersCount || 0) + 1;
      }
      await this.toast('AGENT_PROFILE.FOLLOW_SUCCESS');
    } finally {
      this.followBusy = false;
    }
  }

  private async load(id: number): Promise<void> {
    this.loading = true;
    this.notFound = false;

    try {
      const res: any = await firstValueFrom(
        this.http.get(`${environment.apiUrl}/agents/${id}`),
      );
      const raw = res?.data ?? res;
      if (!raw?.id) throw new Error('missing');
      this.agent = {
        id: Number(raw.id),
        agencyName: raw.agencyName || 'Agent',
        phone: raw.phone,
        address: raw.address,
        verified: !!raw.verified,
        description: raw.description,
        avatarUrl: raw.avatarUrl,
        createdAt: raw.createdAt,
        followersCount: Number(raw.followersCount ?? raw._count?.followers ?? 0) || 0,
        listingsCount: Number(raw.listingsCount ?? raw._count?.properties ?? 0) || 0,
      };
    } catch {
      const local = this.data.properties.find(
        (p) => p.agentId === id || Number(p.publisher?.id) === id,
      );
      if (!local) {
        this.notFound = true;
        this.loading = false;
        return;
      }
      const same = this.data.properties.filter(
        (p) =>
          p.agentId === id ||
          Number(p.publisher?.id) === id ||
          (p.publisher?.name || '') === local.publisher.name,
      );
      this.agent = {
        id,
        agencyName: local.publisher.name,
        phone: local.publisher.phone,
        verified: local.publisher.verified,
        avatarUrl: local.publisher.image,
        createdAt: `${local.publisher.memberSince}-01-01`,
        followersCount: 0,
        listingsCount: same.length,
      };
    }

    const meAgent = this.agentAuth.currentAgent;
    this.isOwnProfile = !!meAgent && Number(meAgent.id) === Number(this.agent?.id);

    await this.refreshFollow();

    if (this.agent && this.auth.currentUser && !this.isOwnProfile) {
      void this.messages
        .startConversation({
          name: this.agent.agencyName,
          avatar: this.avatar,
          role: 'Agent immobilier',
          agentId: this.agent.id,
        })
        .then((convId) => this.messages.waitForPeerPresence(convId, 2500))
        .then((ok) => { this.peerOnline = ok; })
        .catch(() => {
          // Pas de conversation (ex. agent démo) → ne pas afficher un faux « hors ligne »
          this.peerOnline = null;
        });
    }

    let apiList: Property[] = [];
    try {
      const res: any = await firstValueFrom(
        this.http.get(`${environment.apiUrl}/properties?agentId=${id}&limit=50`),
      );
      const raw = res?.data?.items ?? res?.data ?? res?.items ?? [];
      if (Array.isArray(raw)) {
        apiList = raw.map((p: any) => this.mapProperty(p));
      }
    } catch {
      apiList = [];
    }

    const localListings = this.data.properties.filter(
      (p) =>
        p.agentId === id ||
        Number(p.publisher?.id) === id ||
        (!!this.agent && (p.publisher?.name || '') === this.agent.agencyName),
    );

    const seen = new Set<number>();
    this.listings = [];
    for (const p of [...apiList, ...localListings]) {
      if (!p?.id || seen.has(p.id)) continue;
      seen.add(p.id);
      this.listings.push(p);
    }

    if (this.agent) {
      this.agent.listingsCount = Math.max(this.agent.listingsCount || 0, this.listings.length);
    }

    this.loading = false;
  }

  private mapProperty(raw: any): Property {
    const agentRow = raw.agent || raw.publisher || {};
    const images = Array.isArray(raw.images) && raw.images.length
      ? raw.images
      : Array.isArray(raw.photos) && raw.photos.length
        ? raw.photos
        : [''];
    return {
      id: Number(raw.id),
      title: raw.title || '',
      city: raw.city || '',
      address: raw.address || raw.location || '',
      price: Number(raw.price || 0),
      images,
      category: raw.category || 'Studios',
      rating: Number(raw.rating || 0),
      reviews: Number(raw.reviews || raw.reviewsCount || 0),
      surface: Number(raw.surface || 0),
      rooms: Number(raw.rooms || 0),
      floor: raw.floor || '',
      furnished: !!raw.furnished,
      availableFrom: raw.availableFrom || '',
      description: raw.description || '',
      amenities: Array.isArray(raw.amenities) ? raw.amenities : [],
      agentId: Number(raw.agentId || agentRow.id || 0) || undefined,
      publisher: {
        id: agentRow.id,
        name: agentRow.agencyName || agentRow.name || 'Agent',
        image: agentRow.avatarUrl || agentRow.image || DEFAULT_AVATAR,
        phone: agentRow.phone || '',
        memberSince: '',
        verified: !!agentRow.verified,
        rating: 0,
        responseTime: '',
      },
    };
  }

  private async refreshFollow(): Promise<void> {
    if (!this.agent || this.isOwnProfile) {
      this.following = false;
      return;
    }
    if (!this.auth.currentUser && !this.agentAuth.currentAgent) {
      this.following = false;
      return;
    }
    const status = await this.followService.getStatus(this.agent.id);
    this.following = !!status.following;
    if (typeof status.followersCount === 'number' && this.agent) {
      this.agent.followersCount = status.followersCount;
    }
  }

  private async toast(key: string): Promise<void> {
    const t = await this.toastCtrl.create({
      message: this.translate.instant(key),
      duration: 2500,
      position: 'top',
      color: 'medium',
    });
    await t.present();
  }
}
