import { Component, OnDestroy, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { CallService } from '../../services/call.service';
import { MockDataService, Product, Review } from '../../services/mock-data.service';
import { MessagesService } from '../../services/messages.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-detailsproduit',
  templateUrl: './detailsproduit.page.html',
  styleUrls: ['./detailsproduit.page.scss'],
  standalone: false
})
export class DetailsproduitPage implements OnInit, OnDestroy {

  product?: Product;
  loading = true;
  isFavorite = false;
  isLiked = false;
  isOwner = false;

  similarProducts: Product[] = [];
  sellerProducts: Product[] = [];
  mapUrl: SafeResourceUrl | null = null;
  mapCityLabel = '';
  calling = false;
  deleting = false;

  reviewsList: Review[] = [];
  reviewRating = 5;
  reviewComment = '';
  reviewSending = false;

  private routeSub?: Subscription;
  private mapReq = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private sanitizer: DomSanitizer,
    private messagesService: MessagesService,
    private calls: CallService,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private translate: TranslateService,
    public data: MockDataService,
    private auth: AuthService,
  ) {}

  ngOnInit(): void {
    this.routeSub = this.route.paramMap.subscribe((params) => {
      const id = Number(params.get('id'));
      void this.load(id);
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }

  private async load(id: number): Promise<void> {
    if (!id) return;
    this.loading = true;
    this.similarProducts = [];
    this.sellerProducts = [];
    this.mapUrl = null;
    this.mapCityLabel = '';

    this.product = this.data.getProductById(id) || await this.data.loadProductById(id);
    if (!this.product) {
      this.product = await this.data.loadProductById(id);
    }

    this.loading = false;
    if (!this.product) return;

    this.isOwner = this.checkIsOwner(this.product);
    this.isLiked = !!this.product.likedByMe || this.data.isProductLiked(this.product.id);
    this.isFavorite = !!this.product.isFavorite || this.data.isProductFavorite(this.product.id);
    void this.updateMap(this.product.city);
    void this.loadRelated(this.product);
    void this.loadReviews();
  }

  private checkIsOwner(product?: Product): boolean {
    const me = this.auth.currentUser;
    if (!me || !product) return false;
    const myId = String(me.id);
    const sellerId = String(product.sellerId ?? product.seller?.id ?? '');
    return !!sellerId && sellerId === myId;
  }

  private async loadReviews(): Promise<void> {
    if (!this.product) return;
    this.reviewsList = await this.data.loadReviews('PRODUCT', this.product.id);
  }

  async submitReview(): Promise<void> {
    if (!this.auth.isLoggedIn) {
      void this.router.navigateByUrl('/login');
      return;
    }
    if (!this.product || !this.reviewComment.trim()) return;
    this.reviewSending = true;
    try {
      await this.data.createReview('PRODUCT', this.product.id, this.reviewRating, this.reviewComment.trim());
      this.reviewComment = '';
      this.reviewRating = 5;
      await this.loadReviews();
    } finally {
      this.reviewSending = false;
    }
  }

  private async updateMap(city: string): Promise<void> {
    const label = (city || '').trim() || 'Tunisie';
    this.mapCityLabel = label;
    const req = ++this.mapReq;

    // Embed Google Maps en français
    const gq = encodeURIComponent(label.includes('Tunisie') ? label : `${label}, Tunisie`);
    this.mapUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://maps.google.com/maps?q=${gq}&hl=fr&gl=fr&ie=UTF8&z=13&output=embed`,
    );

    // Affinage position via Nominatim (garde l’UI Google en FR)
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
      /* garder l’embed par ville */
    }
  }

  private async loadRelated(product: Product): Promise<void> {
    if (!this.data.products?.length) {
      await this.data.loadProducts().catch(() => {});
    }

    const [byCategory, bySeller] = await Promise.all([
      this.data.queryProducts({ category: product.category, limit: 12 }),
      product.sellerId
        ? this.data.queryProducts({ sellerId: product.sellerId, limit: 8 })
        : Promise.resolve([] as Product[]),
    ]);

    const mergeUnique = (lists: Product[][]) => {
      const seen = new Set<number>();
      const out: Product[] = [];
      for (const list of lists) {
        for (const p of list) {
          if (!p || p.id === product.id || seen.has(p.id)) continue;
          seen.add(p.id);
          out.push(p);
        }
      }
      return out;
    };

    // Autres annonces du même vendeur (id ou nom réel)
    this.sellerProducts = mergeUnique([bySeller, this.otherSellerProducts(product)]).slice(0, 8);
    const sellerIds = new Set(this.sellerProducts.map((p) => p.id));

    const catalog = this.data.products.filter((p) => p.id !== product.id);
    const sameCat = [
      ...byCategory.filter((p) => p.id !== product.id),
      ...catalog.filter((p) => p.category === product.category),
    ];

    // Similaires : priorité même catégorie, hors annonces déjà listées du vendeur, toujours max 4
    let similar = mergeUnique([sameCat]).filter((p) => !sellerIds.has(p.id));
    if (similar.length < 4) {
      similar = mergeUnique([similar, catalog.filter((p) => !sellerIds.has(p.id))]);
    }
    // Si le catalogue est trop petit, complète quand même jusqu’à 4
    if (similar.length < 4) {
      similar = mergeUnique([similar, catalog]);
    }
    this.similarProducts = similar.slice(0, 4);
  }

  private otherSellerProducts(product: Product): Product[] {
    const sellerId = product.sellerId || Number(product.seller?.id ?? 0) || 0;
    const sellerName = (product.seller?.name || '').trim().toLowerCase();
    const generic = new Set(['', 'vendeur', 'moi', 'vous', 'seller', 'user', 'inconnu']);
    return this.data.products.filter((p) => {
      if (p.id === product.id) return false;
      if (sellerId && (p.sellerId === sellerId || Number(p.seller?.id) === sellerId)) return true;
      if (!sellerName || generic.has(sellerName)) return false;
      const other = (p.seller?.name || '').trim().toLowerCase();
      if (!other || generic.has(other)) return false;
      return other === sellerName;
    });
  }

  openProduct(id: number): void {
    if (!id) return;
    void this.router.navigate(['/detailsproduit', id]);
  }

  openExternalMap(): void {
    const city = (this.mapCityLabel || this.product?.city || 'Tunisie').trim();
    const q = encodeURIComponent(city.includes('Tunisie') ? city : `${city}, Tunisie`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${q}&hl=fr`, '_blank');
  }

  openNearbyListings(): void {
    if (!this.product) return;
    const city = (this.mapCityLabel || this.product.city || '').trim();
    void this.router.navigate(['/nearby'], {
      queryParams: {
        kind: 'product',
        city,
        exclude: this.product.id,
      },
    });
  }

  async toggleFavorite(): Promise<void> {
    if (!this.product) return;
    this.isFavorite = await this.data.toggleProductFavorite(this.product.id);
  }

  async toggleLike(): Promise<void> {
    if (!this.product) return;
    const res = await this.data.toggleProductLike(this.product.id);
    this.isLiked = res.liked;
    this.product.likedByMe = res.liked;
    this.product.likesCount = res.likesCount;
  }

  async call(): Promise<void> {
    if (!this.product || this.calling || this.isOwner) return;
    this.calling = true;
    try {
      const conversationId = await this.ensureConversation();
      const result = await this.calls.startCall(conversationId, this.product.seller.name);
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

  async converser(): Promise<void> {
    if (!this.product || this.isOwner) return;
    try {
      const conversationId = await this.ensureConversation();
      void this.router.navigate(['/messages', conversationId]);
    } catch (e: any) {
      const msg = typeof e?.message === 'string' && e.message !== 'CONVERSATION_CREATE_FAILED'
        ? e.message
        : this.translate.instant('CALL.NOT_CONNECTED');
      await this.showRawToast(msg);
    }
  }

  private ensureConversation(): Promise<number> {
    if (!this.product) return Promise.reject();
    const sellerId = this.product.sellerId ?? (Number(this.product.seller.id ?? 0) || undefined);
    return Promise.resolve(this.messagesService.startConversation({
      name: this.product.seller.name,
      avatar: this.product.seller.image,
      role: 'Marketplace · ' + this.product.title,
      studentId: sellerId,
    }));
  }

  async confirmDelete(): Promise<void> {
    if (!this.product || !this.isOwner || this.deleting) return;
    const alert = await this.alertCtrl.create({
      header: this.translate.instant('DETAILS_PRODUIT.DELETE_CONFIRM_TITLE'),
      message: this.translate.instant('DETAILS_PRODUIT.DELETE_CONFIRM_MESSAGE', {
        title: this.product.title,
      }),
      buttons: [
        { text: this.translate.instant('COMMON.CANCEL'), role: 'cancel' },
        {
          text: this.translate.instant('COMMON.DELETE'),
          role: 'destructive',
          handler: () => { void this.deleteProduct(); },
        },
      ],
    });
    await alert.present();
  }

  private async deleteProduct(): Promise<void> {
    if (!this.product || !this.isOwner) return;
    this.deleting = true;
    try {
      await this.data.deleteProduct(this.product.id);
      await this.showToast('DETAILS_PRODUIT.DELETED');
      void this.router.navigateByUrl('/tabs/marketplace');
    } catch {
      await this.showToast('DETAILS_PRODUIT.DELETE_ERROR');
    } finally {
      this.deleting = false;
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

  private async showRawToast(message: string): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2800,
      position: 'top',
      color: 'danger',
    });
    await toast.present();
  }
}
