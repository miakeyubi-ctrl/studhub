import { Injectable } from '@angular/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface Publisher {
  id?: number | string;
  name: string;
  image: string;
  phone: string;
  memberSince: string;
  verified: boolean;
  rating: number;
  responseTime: string;
}

export interface Property {
  id: number;
  title: string;
  city: string;
  address: string;
  price: number;
  images: string[];
  category: string;
  rating: number;
  reviews: number;
  surface: number;
  rooms: number;
  bedrooms?: number | null;
  bathrooms?: number | null;
  floor: string;
  furnished: boolean;
  available?: boolean;
  availableFrom: string;
  depositFee?: number | null;
  viewsCount?: number;
  likesCount?: number;
  likedByMe?: boolean;
  latitude?: number | null;
  longitude?: number | null;
  description: string;
  amenities: string[];
  publisher: Publisher;
  agentId?: number;
  isFavorite?: boolean;
}

export interface ProductSpec {
  label: string;
  value: string;
}

export interface Product {
  id: number;
  title: string;
  category: string;
  price: number;
  images: string[];
  condition: string;
  city: string;
  negotiable: boolean;
  description: string;
  specs: ProductSpec[];
  seller: Publisher;
  sellerId?: number;
  viewsCount?: number;
  likesCount?: number;
  likedByMe?: boolean;
  isFavorite?: boolean;
}

export interface ServiceProvider {
  id: number;
  userId?: number;
  name: string;
  profession: string;
  category: string;
  tier: 'Gratuit' | 'Standard' | 'Premium';
  rating: number;
  reviews: number;
  likes: number;
  comments: number;
  images: string[];
  isFavorite?: boolean;
  description: string;
  city: string;
  phone: string;
  experienceYears: number;
  completedMissions: number;
  responseTime: string;
  priceRange: string;
  services: string[];
  memberSince: string;
  verified: boolean;
}

export interface FeedPostComment {
  id: number;
  authorId: number;
  authorName: string;
  authorAvatar?: string;
  text: string;
  createdAt: string | number;
}

export interface FeedPost {
  id: number;
  authorId: number;
  authorName: string;
  authorAvatar?: string;
  content: string;
  images?: string[];
  likesCount: number;
  commentsCount: number;
  likedByMe?: boolean;
  comments?: FeedPostComment[];
  createdAt: string | number;
}

export interface Review {
  id: number;
  targetType: 'PROPERTY' | 'PRODUCT' | 'PROVIDER';
  targetId: number;
  authorId: number;
  authorName: string;
  authorAvatar?: string;
  rating: number;
  comment: string;
  createdAt: string | number;
}

const CACHE_KEY = 'studhub-catalog-cache-v4';
const LEGACY_CACHE_KEYS = [
  'studhub-catalog-cache-v1',
  'studhub-catalog-cache-v2',
  'studhub-catalog-cache-v3',
];
const FAVORITES_KEY = 'studhub-favorites-v1';
const PRODUCT_FAVORITES_KEY = 'studhub-product-favorites-v1';
const PROVIDER_FAVORITES_KEY = 'studhub-provider-favorites-v1';
const PROPERTY_LIKES_KEY = 'studhub-property-likes-v1';
const PRODUCT_LIKES_KEY = 'studhub-product-likes-v1';

const DEFAULT_IMG_PROPERTY = 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=1000&auto=format&fit=crop';
const DEFAULT_IMG_AVATAR = 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=200&auto=format&fit=crop';

@Injectable({ providedIn: 'root' })
export class MockDataService {

  private _properties = new BehaviorSubject<Property[]>([]);
  private _products = new BehaviorSubject<Product[]>([]);
  private _providers = new BehaviorSubject<ServiceProvider[]>([]);
  private _posts = new BehaviorSubject<FeedPost[]>([]);
  private _reviews = new BehaviorSubject<Review[]>([]);
  private _favorites = new BehaviorSubject<Set<number>>(this.loadFavorites());
  private _productFavorites = new BehaviorSubject<Set<number>>(this.loadIdSet(PRODUCT_FAVORITES_KEY));
  private _providerFavorites = new BehaviorSubject<Set<number>>(this.loadIdSet(PROVIDER_FAVORITES_KEY));
  private _propertyLikes = new BehaviorSubject<Set<number>>(this.loadIdSet(PROPERTY_LIKES_KEY));
  private _productLikes = new BehaviorSubject<Set<number>>(this.loadIdSet(PRODUCT_LIKES_KEY));

  properties: Property[] = [];
  products: Product[] = [];
  prestataires: ServiceProvider[] = [];
  posts: FeedPost[] = [];
  reviews: Review[] = [];
  favorites: Set<number> = this._favorites.value;
  productFavorites: Set<number> = this._productFavorites.value;
  providerFavorites: Set<number> = this._providerFavorites.value;
  propertyLikes: Set<number> = this._propertyLikes.value;
  productLikes: Set<number> = this._productLikes.value;

  private liveSyncTimer: ReturnType<typeof setInterval> | null = null;
  private liveSyncInFlight = false;

  constructor(private http: HttpClient) {
    this.purgeLegacyCaches();
    this.loadCache();
    void this.loadAllFromBackend();
    this.startLiveCatalogSync(15000);
  }

  /** Supprime les anciens caches démo (annonces fantômes après wipe BDD). */
  private purgeLegacyCaches(): void {
    try {
      for (const k of LEGACY_CACHE_KEYS) localStorage.removeItem(k);
    } catch { /* ignore */ }
  }

  /* =============== BOOTSTRAP: charge tout depuis back au démarrage (silencieux) =============== */

  async loadAllFromBackend(): Promise<void> {
    try {
      await Promise.all([
        this.loadProperties({ limit: 100 }),
        this.loadProducts({ limit: 100 }),
        this.loadProviders({ limit: 100 } as any),
        this.loadPosts({ limit: 100 }),
      ]);
      await this.hydrateFavoritesFromApi();
    } catch {}
  }

  /** Polling léger pour voir les nouvelles annonces sans quitter l’écran. */
  startLiveCatalogSync(intervalMs = 15000): void {
    if (this.liveSyncTimer) return;
    this.liveSyncTimer = setInterval(() => {
      void this.refreshCatalogQuiet();
    }, intervalMs);
  }

  /** Évite de republier le même catalogue (sinon les <img> se remountent et « bougent »). */
  private sameCatalogSignature(
    prev: Array<{ id: number; images?: string[]; image?: string; likesCount?: number; viewsCount?: number; price?: number; title?: string }>,
    next: Array<{ id: number; images?: string[]; image?: string; likesCount?: number; viewsCount?: number; price?: number; title?: string }>,
  ): boolean {
    if (prev === next) return true;
    if (prev.length !== next.length) return false;
    for (let i = 0; i < prev.length; i++) {
      const a = prev[i];
      const b = next[i];
      if (a.id !== b.id) return false;
      if ((a.title || '') !== (b.title || '')) return false;
      if (Number(a.price ?? 0) !== Number(b.price ?? 0)) return false;
      if (Number(a.likesCount ?? 0) !== Number(b.likesCount ?? 0)) return false;
      if (Number(a.viewsCount ?? 0) !== Number(b.viewsCount ?? 0)) return false;
      const ai = a.images?.[0] || a.image || '';
      const bi = b.images?.[0] || b.image || '';
      if (ai !== bi) return false;
    }
    return true;
  }

  stopLiveCatalogSync(): void {
    if (this.liveSyncTimer) {
      clearInterval(this.liveSyncTimer);
      this.liveSyncTimer = null;
    }
  }

  async refreshCatalogQuiet(): Promise<void> {
    if (this.liveSyncInFlight) return;
    this.liveSyncInFlight = true;
    try {
      await this.loadAllFromBackend();
    } finally {
      this.liveSyncInFlight = false;
    }
  }

  /* =============== PROPERTIES =============== */

  get properties$() { return this._properties.asObservable(); }

  async loadProperties(params?: Partial<{
    city: string; category: string; search: string; furnished: boolean;
    priceMin: number; priceMax: number; roomsMin: number; surfaceMin: number;
    page: number; limit: number;
  }>): Promise<Property[]> {
    try {
      const query = new URLSearchParams();
      const merged = { limit: 100, ...(params ?? {}) };
      Object.entries(merged).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') query.set(k, String(v)); });
      const url = `${environment.apiUrl}/properties${query.toString() ? `?${query}` : ''}`;
      const res: any = await firstValueFrom(this.http.get(url));
      if (res?.success && Array.isArray(res?.data?.items || res?.data)) {
        const raw = res.data.items ?? res.data;
        const mapped = raw.map((p: any) => this.normalizeProperty(p));
        if (this.sameCatalogSignature(this._properties.value, mapped)) {
          return this._properties.value;
        }
        this._properties.next(mapped);
        this.properties = mapped;
        this.saveCache();
        return mapped;
      }
    } catch {}
    return this._properties.value;
  }

  getPropertyById(id: number): Property | undefined {
    void this.loadPropertyById(id); // fetch back en arrière-plan
    return this.properties.find(p => p.id === id);
  }

  async loadPropertyById(id: number): Promise<Property | undefined> {
    try {
      const res: any = await firstValueFrom(this.http.get(`${environment.apiUrl}/properties/${id}`));
      if (res?.success && res?.data) {
        const norm = this.normalizeProperty(res.data);
        const list = this._properties.value.map(p => p.id === id ? norm : p);
        if (!list.find(p => p.id === id)) list.unshift(norm);
        this._properties.next(list);
        this.properties = list;
        this.saveCache();
        return norm;
      }
    } catch {}
    return this.properties.find(p => p.id === id);
  }

  get favorites$() { return this._favorites.asObservable(); }
  get productFavorites$() { return this._productFavorites.asObservable(); }
  get providerFavorites$() { return this._providerFavorites.asObservable(); }
  get propertyLikes$() { return this._propertyLikes.asObservable(); }
  get productLikes$() { return this._productLikes.asObservable(); }

  getFavoriteProperties(): Property[] {
    return this.properties.filter(p => this.favorites.has(p.id));
  }

  getFavoriteProducts(): Product[] {
    return this.products.filter(p => this.productFavorites.has(p.id));
  }

  getFavoriteProviders(): ServiceProvider[] {
    return this.prestataires.filter(p => this.providerFavorites.has(p.id));
  }

  async toggleFavorite(propertyId: number): Promise<boolean> {
    try {
      const res: any = await firstValueFrom(this.http.post(`${environment.apiUrl}/properties/${propertyId}/favorite`, {}));
      const flag = res?.data?.isFavorite ?? res?.data?.favorited;
      if (res?.success && typeof flag === 'boolean') {
        this.setFavoriteLocal(propertyId, flag);
        return flag;
      }
    } catch {}
    const next = !this.favorites.has(propertyId);
    this.setFavoriteLocal(propertyId, next);
    return next;
  }

  isFavorite(id: number): boolean { return this.favorites.has(id); }

  async toggleProductFavorite(productId: number): Promise<boolean> {
    try {
      const res: any = await firstValueFrom(this.http.post(`${environment.apiUrl}/products/${productId}/favorite`, {}));
      const flag = res?.data?.favorited;
      if (res?.success && typeof flag === 'boolean') {
        this.setProductFavoriteLocal(productId, flag);
        return flag;
      }
    } catch {}
    const next = !this.productFavorites.has(productId);
    this.setProductFavoriteLocal(productId, next);
    return next;
  }

  isProductFavorite(id: number): boolean { return this.productFavorites.has(id); }

  async toggleProviderFavorite(providerId: number): Promise<boolean> {
    try {
      const res: any = await firstValueFrom(this.http.post(`${environment.apiUrl}/providers/${providerId}/favorite`, {}));
      const flag = res?.data?.favorited;
      if (res?.success && typeof flag === 'boolean') {
        this.setProviderFavoriteLocal(providerId, flag);
        return flag;
      }
    } catch {}
    const next = !this.providerFavorites.has(providerId);
    this.setProviderFavoriteLocal(providerId, next);
    return next;
  }

  isProviderFavorite(id: number): boolean { return this.providerFavorites.has(id); }

  async hydrateFavoritesFromApi(): Promise<void> {
    try {
      const res: any = await firstValueFrom(this.http.get(`${environment.apiUrl}/products/favorites/mine`));
      if (res?.success && Array.isArray(res?.data?.items || res?.data)) {
        const items = (res.data.items ?? res.data).map((p: any) => this.normalizeProduct(p));
        const ids = new Set<number>(items.map((p: Product) => p.id));
        this._productFavorites.next(ids);
        this.productFavorites = ids;
        try { localStorage.setItem(PRODUCT_FAVORITES_KEY, JSON.stringify(Array.from(ids))); } catch {}
        const merged = [...items];
        for (const p of this._products.value) {
          if (!ids.has(p.id)) merged.push(p);
        }
        this._products.next(merged);
        this.products = merged;
      }
    } catch {}
    try {
      const res: any = await firstValueFrom(this.http.get(`${environment.apiUrl}/providers/favorites/mine`));
      if (res?.success && Array.isArray(res?.data?.items || res?.data)) {
        const items = (res.data.items ?? res.data).map((p: any) => this.normalizeProvider(p));
        const ids = new Set<number>(items.map((p: ServiceProvider) => p.id));
        this._providerFavorites.next(ids);
        this.providerFavorites = ids;
        try { localStorage.setItem(PROVIDER_FAVORITES_KEY, JSON.stringify(Array.from(ids))); } catch {}
        const merged = [...items];
        for (const p of this._providers.value) {
          if (!ids.has(p.id)) merged.push(p);
        }
        this._providers.next(merged);
        this.prestataires = merged;
      }
    } catch {}
  }

  async togglePropertyLike(propertyId: number): Promise<{ liked: boolean; likesCount: number }> {
    try {
      const res: any = await firstValueFrom(this.http.post(`${environment.apiUrl}/properties/${propertyId}/like`, {}));
      const liked = res?.data?.liked;
      const likesCount = Number(res?.data?.likesCount);
      if (res?.success && typeof liked === 'boolean' && !Number.isNaN(likesCount)) {
        this.setPropertyLikeLocal(propertyId, liked, likesCount);
        return { liked, likesCount };
      }
    } catch {}
    const liked = !this.propertyLikes.has(propertyId);
    const current = this.properties.find(p => p.id === propertyId)?.likesCount ?? 0;
    const likesCount = Math.max(0, current + (liked ? 1 : -1));
    this.setPropertyLikeLocal(propertyId, liked, likesCount);
    return { liked, likesCount };
  }

  isPropertyLiked(id: number): boolean { return this.propertyLikes.has(id); }

  async toggleProductLike(productId: number): Promise<{ liked: boolean; likesCount: number }> {
    try {
      const res: any = await firstValueFrom(this.http.post(`${environment.apiUrl}/products/${productId}/like`, {}));
      const liked = res?.data?.liked;
      const likesCount = Number(res?.data?.likesCount);
      if (res?.success && typeof liked === 'boolean' && !Number.isNaN(likesCount)) {
        this.setProductLikeLocal(productId, liked, likesCount);
        return { liked, likesCount };
      }
    } catch {}
    const liked = !this.productLikes.has(productId);
    const current = this.products.find(p => p.id === productId)?.likesCount ?? 0;
    const likesCount = Math.max(0, current + (liked ? 1 : -1));
    this.setProductLikeLocal(productId, liked, likesCount);
    return { liked, likesCount };
  }

  isProductLiked(id: number): boolean { return this.productLikes.has(id); }

  /* =============== PRODUCTS (MARKETPLACE) =============== */

  get products$() { return this._products.asObservable(); }

  async loadProducts(params?: Partial<{ city: string; category: string; search: string; priceMin: number; priceMax: number; condition: string; sellerId: number; limit?: number; }>): Promise<Product[]> {
    try {
      const query = new URLSearchParams();
      const merged = { limit: 100, ...(params ?? {}) };
      Object.entries(merged).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') query.set(k, String(v)); });
      const url = `${environment.apiUrl}/products${query.toString() ? `?${query}` : ''}`;
      const res: any = await firstValueFrom(this.http.get(url));
      if (res?.success && Array.isArray(res?.data?.items || res?.data)) {
        const raw = res.data.items ?? res.data;
        const mapped = raw.map((p: any) => this.normalizeProduct(p));
        if (this.sameCatalogSignature(this._products.value, mapped)) {
          return this._products.value;
        }
        this._products.next(mapped);
        this.products = mapped;
        this.saveCache();
        return mapped;
      }
    } catch {}
    return this._products.value;
  }

  /** Requête produits sans écraser le cache marketplace. */
  async queryProducts(params?: Partial<{
    city: string;
    category: string;
    search: string;
    sellerId: number;
    limit: number;
  }>): Promise<Product[]> {
    try {
      const query = new URLSearchParams();
      const mapped = { ...params };
      if (mapped.category) {
        mapped.category = this.toProductCategoryEnum(mapped.category);
      }
      Object.entries(mapped ?? {}).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') query.set(k, String(v));
      });
      const url = `${environment.apiUrl}/products${query.toString() ? `?${query}` : ''}`;
      const res: any = await firstValueFrom(this.http.get(url));
      if (res?.success && Array.isArray(res?.data?.items || res?.data)) {
        const raw = res.data.items ?? res.data;
        const fromApi = raw.map((p: any) => this.normalizeProduct(p));
        // Liste API vide → garder le catalogue local (démo / seed)
        if (fromApi.length > 0) return fromApi;
      }
    } catch {}
    // Fallback local
    let list = [...this._products.value];
    if (params?.sellerId) list = list.filter((p) => p.sellerId === Number(params.sellerId));
    if (params?.category) {
      const cat = params.category;
      list = list.filter((p) =>
        p.category === cat || this.toProductCategoryEnum(p.category) === this.toProductCategoryEnum(cat),
      );
    }
    if (params?.city) {
      const c = params.city.toLowerCase();
      list = list.filter((p) => p.city.toLowerCase().includes(c));
    }
    if (params?.limit) list = list.slice(0, Number(params.limit));
    return list;
  }

  private toProductCategoryEnum(raw: string | undefined | null): string {
    const key = String(raw || '').trim();
    const map: Record<string, string> = {
      Électronique: 'ELECTRONIQUE',
      Electronique: 'ELECTRONIQUE',
      ELECTRONIQUE: 'ELECTRONIQUE',
      Livres: 'LIVRES',
      LIVRES: 'LIVRES',
      Meubles: 'MEUBLES',
      MEUBLES: 'MEUBLES',
      Vêtements: 'VETEMENTS',
      Vetements: 'VETEMENTS',
      VETEMENTS: 'VETEMENTS',
      Autres: 'AUTRES',
      AUTRES: 'AUTRES',
    };
    return map[key] || key.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  private toProductConditionEnum(raw: string | undefined | null): string {
    const key = String(raw || '').trim().toLowerCase();
    if (key.includes('neuf') && !key.includes('très') && !key.includes('tres')) return 'NEW';
    if (key.includes('très') || key.includes('tres') || key.includes('like')) return 'LIKE_NEW';
    if (key.includes('pièce') || key.includes('piece') || key.includes('parts')) return 'FOR_PARTS';
    return 'USED';
  }

  getProductById(id: number): Product | undefined {
    void this.loadProductById(id);
    return this.products.find(p => p.id === id);
  }

  async loadProductById(id: number): Promise<Product | undefined> {
    try {
      const res: any = await firstValueFrom(this.http.get(`${environment.apiUrl}/products/${id}`));
      if (res?.success && res?.data) {
        const norm = this.normalizeProduct(res.data);
        const list = this._products.value.map(p => p.id === id ? norm : p);
        if (!list.find(p => p.id === id)) list.unshift(norm);
        this._products.next(list); this.products = list; this.saveCache();
        return norm;
      }
    } catch {}
    return this.products.find(p => p.id === id);
  }

  async createProduct(body: Omit<Product, 'id' | 'seller'> & { sellerId: number }): Promise<Product | undefined> {
    const payload = {
      title: body.title,
      description: body.description || null,
      price: body.price,
      category: this.toProductCategoryEnum(body.category),
      condition: this.toProductConditionEnum(body.condition),
      photos: (body.images || []).filter((u) => !!u && !u.startsWith('data:')),
      location: body.city || null,
    };
    try {
      const res: any = await firstValueFrom(this.http.post(`${environment.apiUrl}/products`, payload));
      if (res?.success && res?.data) {
        const norm = this.normalizeProduct(res.data);
        const list = [norm, ...this._products.value.filter((p) => p.id !== norm.id)];
        this._products.next(list); this.products = list; this.saveCache();
        return norm;
      }
    } catch (e) {
      console.warn('[marketplace] createProduct failed', e);
    }
    return undefined;
  }

  async deleteProduct(id: number): Promise<void> {
    try {
      await firstValueFrom(this.http.delete(`${environment.apiUrl}/products/${id}`));
    } catch (err: any) {
      const status = err?.status ?? err?.error?.statusCode;
      if (status === 401 || status === 403 || status === 404) {
        throw new Error('FORBIDDEN');
      }
      throw err;
    }
    const list = this._products.value.filter(p => p.id !== id);
    this._products.next(list); this.products = list; this.saveCache();
  }

  /* =============== PROVIDERS (STUD SERVICES) =============== */

  get providers$() { return this._providers.asObservable(); }

  async loadProviders(params?: Partial<{ city: string; category: string; search: string; tier: string; }>): Promise<ServiceProvider[]> {
    try {
      const query = new URLSearchParams();
      Object.entries(params ?? {}).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') query.set(k, String(v)); });
      const url = `${environment.apiUrl}/providers${query.toString() ? `?${query}` : ''}`;
      const res: any = await firstValueFrom(this.http.get(url));
      if (res?.success && Array.isArray(res?.data?.items || res?.data)) {
        const raw = res.data.items ?? res.data;
        const mapped = raw.map((p: any) => this.normalizeProvider(p));
        if (this.sameCatalogSignature(this._providers.value as any, mapped as any)) {
          return this._providers.value;
        }
        this._providers.next(mapped);
        this.prestataires = mapped;
        this.saveCache();
        return mapped;
      }
    } catch {}
    return this._providers.value;
  }

  getPrestataireById(id: number): ServiceProvider | undefined {
    void this.loadProviderById(id);
    return this.prestataires.find(p => p.id === id);
  }

  async loadProviderById(id: number): Promise<ServiceProvider | undefined> {
    try {
      const res: any = await firstValueFrom(this.http.get(`${environment.apiUrl}/providers/${id}`));
      if (res?.success && res?.data) {
        const norm = this.normalizeProvider(res.data);
        const list = this._providers.value.map(p => p.id === id ? norm : p);
        if (!list.find(p => p.id === id)) list.unshift(norm);
        this._providers.next(list); this.prestataires = list; this.saveCache();
        return norm;
      }
    } catch {}
    return this.prestataires.find(p => p.id === id);
  }

  async createProvider(body: {
    category: string;
    title: string;
    bio?: string;
    phoneContact: string;
    city: string;
    portfolioUrls?: string[];
    emailContact?: string;
    priceStart?: number;
    priceEnd?: number;
  }): Promise<ServiceProvider | undefined> {
    try {
      const res: any = await firstValueFrom(
        this.http.post(`${environment.apiUrl}/providers`, {
          category: body.category,
          title: body.title,
          bio: body.bio || null,
          phoneContact: body.phoneContact,
          city: body.city,
          portfolioUrls: body.portfolioUrls ?? [],
          emailContact: body.emailContact || null,
          priceStart: body.priceStart,
          priceEnd: body.priceEnd,
        }),
      );
      if (res?.success && res?.data) {
        const norm = this.normalizeProvider(res.data);
        const list = [norm, ...this._providers.value];
        this._providers.next(list);
        this.prestataires = list;
        this.saveCache();
        return norm;
      }
    } catch {}
    return undefined;
  }

  /* =============== FEED POSTS =============== */

  get posts$() { return this._posts.asObservable(); }

  async loadPosts(params?: Partial<{ page: number; limit: number; }>): Promise<FeedPost[]> {
    try {
      const query = new URLSearchParams();
      const merged = { limit: 100, ...(params ?? {}) };
      Object.entries(merged).forEach(([k, v]) => {
        const value = v as number | string | undefined | null;
        if (value !== undefined && value !== null && String(value) !== '') {
          query.set(k, String(value));
        }
      });
      const url = `${environment.apiUrl}/posts${query.toString() ? `?${query}` : ''}`;
      const res: any = await firstValueFrom(this.http.get(url));
      if (res?.success && Array.isArray(res?.data?.items || res?.data)) {
        const raw = res.data.items ?? res.data;
        const mapped = raw.map((p: any) => this.normalizePost(p));
        this._posts.next(mapped);
        this.posts = mapped;
        this.saveCache();
        return mapped;
      }
    } catch {}
    return this._posts.value;
  }

  async createPost(
    text: string,
    opts?: { imageUrl?: string; associationTag?: string },
  ): Promise<FeedPost | undefined> {
    const payload = {
      text: text.trim(),
      imageUrl: opts?.imageUrl || null,
      associationTag: opts?.associationTag?.trim() || null,
    };
    try {
      const res: any = await firstValueFrom(
        this.http.post(`${environment.apiUrl}/posts`, payload),
      );
      if (res?.success && res?.data) {
        const norm = this.normalizePost(res.data);
        const list = [norm, ...this._posts.value.filter((p) => p.id !== norm.id)];
        this._posts.next(list);
        this.posts = list;
        this.saveCache();
        return norm;
      }
    } catch (e) {
      console.warn('[feed] createPost failed', e);
    }
    return undefined;
  }

  async deletePost(id: number): Promise<void> {
    try { await firstValueFrom(this.http.delete(`${environment.apiUrl}/posts/${id}`)); } catch {}
    const list = this._posts.value.filter(p => p.id !== id);
    this._posts.next(list); this.posts = list; this.saveCache();
  }

  async toggleLikePost(postId: number): Promise<FeedPost | undefined> {
    try {
      const res: any = await firstValueFrom(this.http.post(`${environment.apiUrl}/posts/${postId}/like`, {}));
      if (res?.success) {
        const liked = Boolean(res?.data?.liked);
        const count = Number(res?.data?.likesCount ?? 0);
        const list = this._posts.value.map(p => p.id === postId ? { ...p, likedByMe: liked, likesCount: count } : p);
        this._posts.next(list); this.posts = list; this.saveCache();
        return list.find(p => p.id === postId);
      }
    } catch {}
    const cur = this.posts.find(p => p.id === postId);
    if (!cur) return undefined;
    const wasLiked = !!cur.likedByMe;
    const list = this._posts.value.map(p => p.id === postId ? {
      ...p, likedByMe: !wasLiked, likesCount: Math.max(0, p.likesCount + (wasLiked ? -1 : 1))
    } : p);
    this._posts.next(list); this.posts = list; this.saveCache();
    return list.find(p => p.id === postId);
  }

  async loadComments(postId: number): Promise<FeedPostComment[]> {
    try {
      const res: any = await firstValueFrom(this.http.get(`${environment.apiUrl}/posts/${postId}/comments`));
      if (res?.success && Array.isArray(res?.data?.items || res?.data)) {
        const items = (res.data.items ?? res.data).map((c: any) => this.normalizeComment(c));
        const list = this._posts.value.map(p => p.id === postId ? { ...p, comments: items, commentsCount: items.length } : p);
        this._posts.next(list); this.posts = list; this.saveCache();
        return items;
      }
    } catch {}
    return this.posts.find(p => p.id === postId)?.comments ?? [];
  }

  async addComment(postId: number, text: string): Promise<FeedPostComment | undefined> {
    try {
      const res: any = await firstValueFrom(this.http.post(`${environment.apiUrl}/posts/${postId}/comments`, { text }));
      if (res?.success && res?.data) {
        const norm = this.normalizeComment(res.data);
        const list = this._posts.value.map(p => {
          if (p.id !== postId) return p;
          const already = (p.comments ?? []).some(c => c.id === norm.id);
          const comments = already ? (p.comments ?? []) : [...(p.comments ?? []), norm];
          return { ...p, comments, commentsCount: comments.length };
        });
        this._posts.next(list); this.posts = list; this.saveCache();
        return norm;
      }
    } catch {}
    const norm: FeedPostComment = {
      id: Math.floor(Math.random() * 1e9), authorId: 0, authorName: 'Moi', text,
      createdAt: Date.now(),
    };
    const list = this._posts.value.map(p => {
      if (p.id !== postId) return p;
      const comments = [...(p.comments ?? []), norm];
      return { ...p, comments, commentsCount: comments.length };
    });
    this._posts.next(list); this.posts = list; this.saveCache();
    return norm;
  }

  /* =============== REVIEWS =============== */

  async loadReviews(targetType: 'PROPERTY' | 'PRODUCT' | 'PROVIDER', targetId: number): Promise<Review[]> {
    try {
      const res: any = await firstValueFrom(this.http.get(`${environment.apiUrl}/reviews?targetType=${targetType}&targetId=${targetId}`));
      if (res?.success && Array.isArray(res?.data?.items || res?.data)) {
        const items = (res.data.items ?? res.data).map((r: any) => this.normalizeReview(r));
        this._reviews.next([...this._reviews.value.filter(r => !(r.targetType === targetType && r.targetId === targetId)), ...items]);
        this.reviews = this._reviews.value;
        return items;
      }
    } catch {}
    return this.reviews.filter(r => r.targetType === targetType && r.targetId === targetId);
  }

  async loadMyReviewCount(): Promise<number> {
    try {
      const res: any = await firstValueFrom(this.http.get(`${environment.apiUrl}/reviews/mine`));
      const data = res?.data ?? res;
      return Number(data?.count || 0);
    } catch {
      return 0;
    }
  }

  async createReview(targetType: 'PROPERTY' | 'PRODUCT' | 'PROVIDER', targetId: number, rating: number, comment: string): Promise<Review | undefined> {
    try {
      const res: any = await firstValueFrom(this.http.post(`${environment.apiUrl}/reviews`, { targetType, targetId, rating, comment }));
      if (res?.success && res?.data) {
        const norm = this.normalizeReview(res.data);
        const list = [...this._reviews.value, norm];
        this._reviews.next(list); this.reviews = list;
        return norm;
      }
    } catch {}
    const norm: Review = {
      id: Math.floor(Math.random() * 1e9), targetType, targetId,
      authorId: 0, authorName: 'Moi', rating, comment, createdAt: Date.now(),
    };
    const list = [...this._reviews.value, norm];
    this._reviews.next(list); this.reviews = list;
    return norm;
  }

  /* =============== HELPERS UI =============== */

  tierClass(tier: ServiceProvider['tier']): string {
    switch (tier) {
      case 'Premium': return 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400';
      case 'Standard': return 'bg-primary-50 dark:bg-primary-700/40 text-primary-700 dark:text-primary-200';
      case 'Gratuit': return 'bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-300';
    }
  }

  telLink(phone: string): string {
    return 'tel:+216' + (phone || '').replace(/\s/g, '');
  }

  whatsappLink(phone: string): string {
    return 'https://wa.me/216' + (phone || '').replace(/\s/g, '');
  }

  /* =============== CACHE / PERSISTENCE LOCAL =============== */

  private saveCache(): void {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        properties: this.properties,
        products: this.products,
        prestataires: this.prestataires,
        posts: this.posts,
        reviews: this.reviews,
        ts: Date.now(),
      }));
    } catch {}
  }

  private loadCache(): void {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return;
      const c = JSON.parse(raw);
      // Cache trop vieux (> 6 h) → ignorer (évite annonces fantômes)
      if (c?.ts && Date.now() - Number(c.ts) > 6 * 60 * 60 * 1000) {
        localStorage.removeItem(CACHE_KEY);
        return;
      }
      if (Array.isArray(c.properties) && c.properties.length) { this._properties.next(c.properties); this.properties = c.properties; }
      if (Array.isArray(c.products) && c.products.length) { this._products.next(c.products); this.products = c.products; }
      if (Array.isArray(c.prestataires) && c.prestataires.length) { this._providers.next(c.prestataires); this.prestataires = c.prestataires; }
      if (Array.isArray(c.posts) && c.posts.length) { this._posts.next(c.posts); this.posts = c.posts; }
      if (Array.isArray(c.reviews)) { this._reviews.next(c.reviews); this.reviews = c.reviews; }
    } catch {}
  }

  private setFavoriteLocal(id: number, isFav: boolean): void {
    const s = new Set(this.favorites);
    if (isFav) s.add(id); else s.delete(id);
    this._favorites.next(s); this.favorites = s;
    try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(s))); } catch {}
    const list = this._properties.value.map(p => p.id === id ? { ...p, isFavorite: isFav } : p);
    this._properties.next(list); this.properties = list;
  }

  private setProductFavoriteLocal(id: number, isFav: boolean): void {
    const s = new Set(this.productFavorites);
    if (isFav) s.add(id); else s.delete(id);
    this._productFavorites.next(s); this.productFavorites = s;
    try { localStorage.setItem(PRODUCT_FAVORITES_KEY, JSON.stringify(Array.from(s))); } catch {}
    const list = this._products.value.map(p => p.id === id ? { ...p, isFavorite: isFav } : p);
    this._products.next(list); this.products = list;
  }

  private setProviderFavoriteLocal(id: number, isFav: boolean): void {
    const s = new Set(this.providerFavorites);
    if (isFav) s.add(id); else s.delete(id);
    this._providerFavorites.next(s); this.providerFavorites = s;
    try { localStorage.setItem(PROVIDER_FAVORITES_KEY, JSON.stringify(Array.from(s))); } catch {}
    const list = this._providers.value.map(p => p.id === id ? { ...p, isFavorite: isFav } : p);
    this._providers.next(list); this.prestataires = list;
  }

  private setPropertyLikeLocal(id: number, liked: boolean, likesCount: number): void {
    const s = new Set(this.propertyLikes);
    if (liked) s.add(id); else s.delete(id);
    this._propertyLikes.next(s); this.propertyLikes = s;
    try { localStorage.setItem(PROPERTY_LIKES_KEY, JSON.stringify(Array.from(s))); } catch {}
    const list = this._properties.value.map(p => p.id === id ? { ...p, likedByMe: liked, likesCount } : p);
    this._properties.next(list); this.properties = list;
  }

  private setProductLikeLocal(id: number, liked: boolean, likesCount: number): void {
    const s = new Set(this.productLikes);
    if (liked) s.add(id); else s.delete(id);
    this._productLikes.next(s); this.productLikes = s;
    try { localStorage.setItem(PRODUCT_LIKES_KEY, JSON.stringify(Array.from(s))); } catch {}
    const list = this._products.value.map(p => p.id === id ? { ...p, likedByMe: liked, likesCount } : p);
    this._products.next(list); this.products = list;
  }

  private loadFavorites(): Set<number> {
    return this.loadIdSet(FAVORITES_KEY);
  }

  private loadIdSet(key: string): Set<number> {
    try {
      const raw = localStorage.getItem(key);
      return new Set<number>((raw ? JSON.parse(raw) ?? [] : []).map((n: any) => Number(n)).filter((n: number) => !Number.isNaN(n)));
    } catch { return new Set<number>(); }
  }

  /* =============== NORMALISATION BACK → FRONT =============== */

  private resolveMediaUrl(url?: string | null): string {
    const u = (url || '').trim();
    if (!u || u === 'null' || u === 'undefined' || u.startsWith('data:')) return DEFAULT_IMG_PROPERTY;
    if (u.startsWith('http://') || u.startsWith('https://') || u.startsWith('blob:')) return u;
    const base = environment.uploadsUrl.replace(/\/$/, '');
    const origin = base.replace(/\/uploads$/i, '');
    if (u.startsWith('/uploads')) return `${origin}${u}`;
    if (u.startsWith('uploads/')) return `${base}/${u.replace(/^uploads\//, '')}`;
    if (u.startsWith('/')) return `${origin}${u}`;
    return `${base}/${u}`;
  }

  private amenityLabel(raw: string): string {
    const key = String(raw || '').trim().toLowerCase().replace(/\s+/g, '_');
    const map: Record<string, string> = {
      wifi: 'Wifi',
      parking: 'Parking',
      climatiseur: 'Climatisation',
      clim: 'Climatisation',
      ascenseur: 'Ascenseur',
      gardien: 'Gardien',
      restauration: 'Restauration',
      vue_mer: 'Vue mer',
      balcon: 'Balcon',
      terrasse: 'Terrasse',
      jardin: 'Jardin',
      buanderie: 'Buanderie',
      cuisine: 'Cuisine équipée',
      meuble: 'Meublé',
    };
    return map[key] || raw;
  }

  private normalizeProperty(raw: any): Property {
    const owner: any = raw.agent || raw.owner || raw.publisher || {};
    const rawImgs: string[] = Array.isArray(raw.photos) && raw.photos.length
      ? raw.photos
      : Array.isArray(raw.images) && raw.images.length
        ? raw.images
        : raw.mainImage
          ? [raw.mainImage]
          : raw.image
            ? [raw.image]
            : [];
    const imgs = rawImgs.map(u => this.resolveMediaUrl(u)).filter(u => !!u && !u.startsWith('data:'));
    const amenitiesRaw = Array.isArray(raw.amenities) ? raw.amenities : raw.amenities?.split?.(',') ?? [];
    const amenities = amenitiesRaw.map((a: string) => this.amenityLabel(String(a))).filter(Boolean);
    const available = raw.available !== false && raw.available !== 'false';
    const deposit = raw.depositFee != null && raw.depositFee !== '' ? Number(raw.depositFee) : null;
    return {
      id: Number(raw.id),
      title: raw.title ?? 'Sans titre',
      city: raw.city ?? '',
      address: raw.address ?? raw.location ?? '',
      price: Number(raw.monthlyRent ?? raw.price ?? 0),
      images: imgs.length ? imgs : [DEFAULT_IMG_PROPERTY],
      category: raw.category ?? 'Studios',
      rating: Number(raw.ratingAvg ?? raw.rating ?? 0),
      reviews: Number(raw.reviewsCount ?? raw._count?.reviews ?? raw.reviews ?? 0),
      surface: Number(raw.surface ?? 0),
      rooms: Number(raw.rooms ?? 0),
      bedrooms: raw.bedrooms != null ? Number(raw.bedrooms) : null,
      bathrooms: raw.bathrooms != null ? Number(raw.bathrooms) : null,
      floor: raw.floor ? String(raw.floor) : '',
      furnished: !!raw.furnished,
      available,
      availableFrom: raw.availableFrom || raw.availableAt || (available ? 'Immédiatement' : 'Indisponible'),
      depositFee: deposit != null && !Number.isNaN(deposit) ? deposit : null,
      viewsCount: Number(raw.viewsCount ?? 0),
      likesCount: Number(raw.likesCount ?? raw._count?.likes ?? 0),
      likedByMe: this.propertyLikes.has(Number(raw.id)) || !!raw.likedByMe,
      latitude: raw.latitude != null && Number.isFinite(Number(raw.latitude)) ? Number(raw.latitude) : null,
      longitude: raw.longitude != null && Number.isFinite(Number(raw.longitude)) ? Number(raw.longitude) : null,
      description: raw.description ?? '',
      amenities,
      publisher: {
        id: owner.id,
        name: owner.agencyName ?? owner.fullName ?? owner.name ?? 'Propriétaire',
        image: (owner.avatarUrl || owner.avatar || owner.image)
          ? this.resolveMediaUrl(owner.avatarUrl ?? owner.avatar ?? owner.image)
          : DEFAULT_IMG_AVATAR,
        phone: owner.phone ?? '',
        memberSince: owner.createdAt ? new Date(owner.createdAt).getFullYear().toString() : new Date().getFullYear().toString(),
        verified: !!owner.verified,
        rating: Number(owner.ratingAvg ?? owner.rating ?? 0),
        responseTime: owner.responseTime || '',
      },
      agentId: Number(raw.agentId ?? owner.id ?? 0) || undefined,
      isFavorite: this.favorites.has(Number(raw.id)),
    };
  }

  private normalizeProduct(raw: any): Product {
    const seller: any = raw.seller || raw.student || raw.owner || {};
    const imgs = Array.isArray(raw.images) && raw.images.length
      ? raw.images
      : Array.isArray(raw.photos) && raw.photos.length
        ? raw.photos
        : (raw.mainImage ? [raw.mainImage] : [DEFAULT_IMG_PROPERTY]);
    const specs = Array.isArray(raw.specs) ? raw.specs : (raw.specifications ?? []);
    return {
      id: Number(raw.id),
      title: raw.title ?? 'Sans titre',
      category: this.fromProductCategory(raw.category),
      price: Number(raw.price ?? 0),
      images: imgs.length ? imgs : [DEFAULT_IMG_PROPERTY],
      condition: this.fromProductCondition(raw.condition),
      city: raw.city || raw.location || '',
      negotiable: !!raw.negotiable,
      description: raw.description ?? '',
      specs,
      seller: {
        name: seller.fullName ?? seller.name ?? 'Vendeur',
        image: seller.avatarUrl ?? seller.avatar ?? seller.image ?? DEFAULT_IMG_AVATAR,
        phone: seller.phone ?? '',
        memberSince: seller.createdAt ? new Date(seller.createdAt).getFullYear().toString() : new Date().getFullYear().toString(),
        verified: !!seller.verified,
        rating: Number(seller.ratingAvg ?? seller.rating ?? 0),
        responseTime: seller.responseTime ?? '',
        id: Number(seller.id ?? raw.sellerId ?? 0) || undefined,
      },
      sellerId: Number(raw.sellerId ?? seller.id ?? 0) || undefined,
      viewsCount: Number(raw.viewsCount ?? 0),
      likesCount: Number(raw.likesCount ?? raw._count?.likes ?? 0),
      likedByMe: this.productLikes.has(Number(raw.id)) || !!raw.likedByMe,
      isFavorite: this.productFavorites.has(Number(raw.id)) || !!raw.isFavorite,
    };
  }

  private fromProductCategory(raw: any): string {
    const key = String(raw || 'AUTRES').toUpperCase();
    const map: Record<string, string> = {
      ELECTRONIQUE: 'Électronique',
      LIVRES: 'Livres',
      MEUBLES: 'Meubles',
      VETEMENTS: 'Vêtements',
      AUTRES: 'Autres',
    };
    return map[key] || String(raw || 'Autres');
  }

  private fromProductCondition(raw: any): string {
    const key = String(raw || '').toUpperCase();
    const map: Record<string, string> = {
      NEW: 'Neuf',
      LIKE_NEW: 'Très bon état',
      USED: 'Bon état',
      FOR_PARTS: 'Pour pièces',
    };
    return map[key] || String(raw || 'Bon état');
  }

  private normalizeProvider(raw: any): ServiceProvider {
    const user: any = raw.user || {};
    const imgs = Array.isArray(raw.portfolioUrls) && raw.portfolioUrls.length
      ? raw.portfolioUrls
      : Array.isArray(raw.images) && raw.images.length
        ? raw.images
        : raw.photo
          ? [raw.photo]
          : user.avatarUrl
            ? [user.avatarUrl]
            : [DEFAULT_IMG_AVATAR];
    const services = Array.isArray(raw.services)
      ? raw.services
      : raw.expertise?.split?.(',')?.map((s: string) => s.trim()).filter(Boolean) ?? [];
    const tierRaw = String(raw.tier || 'GRATUIT').toUpperCase();
    const tier =
      tierRaw === 'PREMIUM' || tierRaw === 'Premium' ? 'Premium'
        : tierRaw === 'STANDARD' || tierRaw === 'Standard' ? 'Standard'
          : 'Gratuit';
    const priceStart = raw.priceStart != null ? Number(raw.priceStart) : null;
    const priceEnd = raw.priceEnd != null ? Number(raw.priceEnd) : null;
    let priceRange = 'À convenir';
    if (priceStart != null && priceEnd != null) priceRange = `${priceStart} - ${priceEnd} DT`;
    else if (priceStart != null) priceRange = `Dès ${priceStart} DT`;

    return {
      id: Number(raw.id),
      userId: Number(raw.userId ?? user.id ?? 0) || undefined,
      name: user.fullName ?? raw.fullName ?? raw.name ?? raw.title ?? 'Prestataire',
      profession: raw.title ?? raw.profession ?? '',
      category: raw.category ?? 'AUTRES',
      tier: tier as ServiceProvider['tier'],
      rating: Number(raw.ratingAvg ?? raw.rating ?? 0),
      reviews: Number(raw.reviewsCount ?? raw.reviews ?? 0),
      likes: Number(raw.likesCount ?? raw.likes ?? 0),
      comments: Number(raw.commentsCount ?? raw.comments ?? 0),
      images: imgs,
      isFavorite: this.providerFavorites.has(Number(raw.id)) || !!raw.isFavorite,
      description: raw.bio ?? raw.description ?? '',
      city: raw.city ?? '',
      phone: raw.phoneContact ?? raw.phone ?? user.phone ?? '',
      experienceYears: Number(raw.experienceYears ?? raw.experience ?? 0),
      completedMissions: Number(raw.completedMissions ?? raw.jobsDone ?? 0),
      responseTime: raw.responseTime ?? '',
      priceRange,
      services,
      memberSince: raw.createdAt ? new Date(raw.createdAt).getFullYear().toString() : new Date().getFullYear().toString(),
      verified: !!(raw.isVerified ?? raw.verified),
    };
  }

  private normalizePost(raw: any): FeedPost {
    const author: any = raw.author || raw.student || {};
    const imageUrl = raw.imageUrl || null;
    const images = Array.isArray(raw.images)
      ? raw.images
      : imageUrl
        ? [imageUrl]
        : undefined;
    return {
      id: Number(raw.id),
      authorId: Number(raw.authorId ?? author.id ?? 0),
      authorName: author.fullName ?? author.name ?? raw.authorName ?? 'Étudiant',
      authorAvatar:
        author.avatarUrl ?? author.avatar ?? author.image ?? raw.authorAvatar ?? DEFAULT_IMG_AVATAR,
      content: raw.text ?? raw.content ?? '',
      images,
      likesCount: Number(raw.likesCount ?? raw._count?.likes ?? 0),
      commentsCount: Number(raw.commentsCount ?? raw._count?.comments ?? 0),
      likedByMe: !!raw.likedByMe,
      comments: Array.isArray(raw.comments) ? raw.comments.map((c: any) => this.normalizeComment(c)) : [],
      createdAt: raw.createdAt ?? Date.now(),
    };
  }

  private normalizeComment(raw: any): FeedPostComment {
    const a: any = raw.author || raw.student || {};
    return {
      id: Number(raw.id),
      authorId: Number(raw.authorId ?? a.id ?? 0),
      authorName: a.fullName ?? a.name ?? raw.authorName ?? 'Étudiant',
      authorAvatar: a.avatar ?? a.image ?? raw.authorAvatar ?? DEFAULT_IMG_AVATAR,
      text: raw.text ?? raw.content ?? '',
      createdAt: raw.createdAt ?? Date.now(),
    };
  }

  private normalizeReview(raw: any): Review {
    const a: any = raw.author || raw.student || {};
    return {
      id: Number(raw.id),
      targetType: (raw.targetType as any) ?? 'PROPERTY',
      targetId: Number(raw.propertyId ?? raw.productId ?? raw.providerId ?? raw.targetId ?? 0),
      authorId: Number(raw.authorId ?? a.id ?? 0),
      authorName: a.fullName ?? a.name ?? raw.authorName ?? 'Étudiant',
      authorAvatar: a.avatar ?? a.image ?? raw.authorAvatar ?? DEFAULT_IMG_AVATAR,
      rating: Number(raw.rating ?? 0),
      comment: raw.comment ?? raw.content ?? '',
      createdAt: raw.createdAt ?? Date.now(),
    };
  }

  /* =============== SEED DÉMO LOCAL (fallback si backend down) =============== */

  private seedProperties(): Property[] {
    return [
      { id: 1, title: 'Studio moderne près du campus', city: 'Tunis, El Manar', address: 'Rue des Oliviers, El Manar 1', price: 450, category: 'Studios', rating: 4.8, reviews: 24, surface: 28, rooms: 1, floor: '2ème étage', furnished: true, available: true, availableFrom: 'Immédiatement', description: "Studio entièrement rénové à 5 minutes à pied de la faculté des sciences.", amenities: ['Wifi fibre', 'Climatisation', 'Cuisine équipée', 'Ascenseur', 'Sécurité 24h/24', 'Machine à laver'], images: ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=1000&auto=format&fit=crop','https://images.unsplash.com/photo-1560185127-6ed189bf02f4?q=80&w=1000&auto=format&fit=crop','https://images.unsplash.com/photo-1556909212-d5b65c56db0a?q=80&w=1000&auto=format&fit=crop','https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=1000&auto=format&fit=crop'], publisher: { id: 201, name: 'Karim Jaziri', image: DEFAULT_IMG_AVATAR, phone: '22 456 789', memberSince: '2022', verified: true, rating: 4.9, responseTime: '~ 30 min' }, agentId: 201, isFavorite: false },
      { id: 2, title: 'Colocation lumineuse', city: 'Sousse, Khezama', address: 'Avenue Khezama Est', price: 320, category: 'Colocations', rating: 4.5, reviews: 17, surface: 65, rooms: 3, floor: 'Rez-de-chaussée', furnished: true, available: true, availableFrom: '01 Octobre', description: 'Grande maison partagée entre étudiants, ambiance conviviale et sécurisée.', amenities: ['Wifi fibre', 'Jardin', 'Parking', 'Cuisine partagée', 'Buanderie', 'Climatisation'], images: ['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=80&w=1000&auto=format&fit=crop','https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?q=80&w=1000&auto=format&fit=crop','https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?q=80&w=1000&auto=format&fit=crop','https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?q=80&w=1000&auto=format&fit=crop'], publisher: { id: 202, name: 'Salma Ferchichi', image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop', phone: '55 321 654', memberSince: '2021', verified: true, rating: 4.6, responseTime: '~ 1 h' }, agentId: 202, isFavorite: false },
      { id: 3, title: 'Résidence universitaire sécurisée', city: 'Sfax, Route de l\'Aéroport', address: 'Route de l\'Aéroport, Km 4', price: 280, category: 'Résidences', rating: 4.6, reviews: 41, surface: 20, rooms: 1, floor: '3ème étage', furnished: true, available: true, availableFrom: 'Immédiatement', description: 'Chambre en résidence universitaire privée avec surveillance 24h/24.', amenities: ['Sécurité 24h/24', 'Salle d\'étude', 'Cafétéria', 'Wifi fibre', 'Buanderie', 'Salle de sport'], images: ['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?q=80&w=1000&auto=format&fit=crop','https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?q=80&w=1000&auto=format&fit=crop','https://images.unsplash.com/photo-1586105251261-72a756497a11?q=80&w=1000&auto=format&fit=crop','https://images.unsplash.com/photo-1571508601891-ca5e7a713859?q=80&w=1000&auto=format&fit=crop'], publisher: { id: 203, name: 'Youssef Amri', image: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?q=80&w=200&auto=format&fit=crop', phone: '98 765 432', memberSince: '2020', verified: true, rating: 4.7, responseTime: '~ 2 h' }, agentId: 203, isFavorite: false },
      { id: 4, title: 'Chambre meublée avec balcon', city: 'Ariana, Centre urbain', address: 'Rue Habib Bourguiba, Centre Urbain Nord', price: 250, category: 'Chambres', rating: 4.3, reviews: 12, surface: 16, rooms: 1, floor: '1er étage', furnished: true, available: true, availableFrom: '15 Septembre', description: 'Chambre indépendante avec balcon privé et bonne luminosité.', amenities: ['Balcon privé', 'Wifi fibre', 'Cuisine partagée', 'Climatisation', 'Proche transports'], images: ['https://images.unsplash.com/photo-1505691938895-1758d7feb511?q=80&w=1000&auto=format&fit=crop','https://images.unsplash.com/photo-1502672023488-70e25813eb80?q=80&w=1000&auto=format&fit=crop','https://images.unsplash.com/photo-1560184897-ae75f418493e?q=80&w=1000&auto=format&fit=crop','https://images.unsplash.com/photo-1560448205-4d9b3e6bb6db?q=80&w=1000&auto=format&fit=crop'], publisher: { id: 201, name: 'Karim Jaziri', image: DEFAULT_IMG_AVATAR, phone: '22 456 789', memberSince: '2022', verified: true, rating: 4.9, responseTime: '~ 30 min' }, agentId: 201, isFavorite: false },
      { id: 5, title: 'Appartement proche fac de médecine', city: 'Monastir', address: 'Avenue de l\'Environnement', price: 400, category: 'Studios', rating: 4.7, reviews: 19, surface: 32, rooms: 1, floor: '4ème étage', furnished: true, available: true, availableFrom: 'Immédiatement', description: 'Bel appartement indépendant à deux pas de la faculté de médecine.', amenities: ['Ascenseur', 'Parking sécurisé', 'Wifi fibre', 'Cuisine équipée', 'Climatisation'], images: ['https://images.unsplash.com/photo-1493809842364-78817add7ffb?q=80&w=1000&auto=format&fit=crop','https://images.unsplash.com/photo-1567767292278-a4f21aa2d36e?q=80&w=1000&auto=format&fit=crop','https://images.unsplash.com/photo-1556020685-ae41abfc9365?q=80&w=1000&auto=format&fit=crop','https://images.unsplash.com/photo-1598928506311-c55ded91a20c?q=80&w=1000&auto=format&fit=crop'], publisher: { id: 202, name: 'Salma Ferchichi', image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop', phone: '55 321 654', memberSince: '2021', verified: true, rating: 4.6, responseTime: '~ 1 h' }, agentId: 202, isFavorite: false },
      { id: 6, title: 'Colocation étudiante conviviale', city: 'La Marsa', address: 'Rue Taïeb Mhiri, La Marsa', price: 380, category: 'Colocations', rating: 4.4, reviews: 15, surface: 58, rooms: 2, floor: 'Rez-de-chaussée', furnished: true, available: true, availableFrom: '01 Octobre', description: 'Colocation entre 3 étudiants dans une villa proche de la plage.', amenities: ['Jardin', 'Terrasse', 'Wifi fibre', 'Parking', 'Proche plage', 'Cuisine équipée'], images: ['https://images.unsplash.com/photo-1484154218962-a197022b5858?q=80&w=1000&auto=format&fit=crop','https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=1000&auto=format&fit=crop','https://images.unsplash.com/photo-1523217582562-09d0def993a6?q=80&w=1000&auto=format&fit=crop','https://images.unsplash.com/photo-1560185008-b033106af5c3?q=80&w=1000&auto=format&fit=crop'], publisher: { id: 203, name: 'Youssef Amri', image: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?q=80&w=200&auto=format&fit=crop', phone: '98 765 432', memberSince: '2020', verified: true, rating: 4.7, responseTime: '~ 2 h' }, agentId: 203, isFavorite: false },
    ];
  }

  private seedProducts(): Product[] {
    return [
      { id: 1, title: 'iPhone 12 - 128 Go', category: 'Électronique', price: 950, images: ['https://images.unsplash.com/photo-1592286927505-1def25115558?q=80&w=1000&auto=format&fit=crop'], condition: 'Très bon état', city: 'Tunis', negotiable: true, description: 'iPhone 12 128 Go, vendu avec chargeur et boîte.', specs: [{label:'Marque',value:'Apple'},{label:'Stockage',value:'128 Go'},{label:'Batterie',value:'89%'},{label:'Accessoires',value:'Chargeur + boîte'}], seller: { id: 101, name: 'Amine Khelifi', image: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?q=80&w=200&auto=format&fit=crop', phone: '92 345 678', memberSince: '2023', verified: true, rating: 4.8, responseTime: '~ 15 min' }, sellerId: 101 },
      { id: 2, title: 'Ordinateur portable Dell', category: 'Électronique', price: 1200, images: ['https://images.unsplash.com/photo-1496181133206-80ce9b88a853?q=80&w=1000&auto=format&fit=crop'], condition: 'Bon état', city: 'Sfax', negotiable: true, description: 'Dell Inspiron Intel Core i5, 8 Go RAM, SSD 256 Go.', specs: [{label:'Processeur',value:'Intel Core i5'},{label:'RAM',value:'8 Go'},{label:'Stockage',value:'SSD 256 Go'},{label:'Écran',value:'15.6"'}], seller: { id: 102, name: 'Salma Trabelsi', image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop', phone: '58 234 567', memberSince: '2022', verified: true, rating: 4.6, responseTime: '~ 40 min' }, sellerId: 102 },
      { id: 3, title: 'Bureau + chaise étudiant', category: 'Meubles', price: 180, images: ['https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?q=80&w=1000&auto=format&fit=crop'], condition: 'Bon état', city: 'Sousse', negotiable: true, description: 'Ensemble bureau et chaise ergonomique.', specs: [{label:'Matériau',value:'Bois massif'},{label:'Dimensions',value:'120 x 60 cm'},{label:'Rangement',value:'1 tiroir'},{label:'Livraison',value:'À convenir'}], seller: { id: 103, name: 'Mohamed Ayari', image: 'https://images.unsplash.com/photo-1531891437562-4301cf35b7e4?q=80&w=200&auto=format&fit=crop', phone: '27 890 123', memberSince: '2021', verified: false, rating: 4.3, responseTime: '~ 1 h' }, sellerId: 103 },
      { id: 4, title: 'Veste d\'hiver taille M', category: 'Vêtements', price: 45, images: ['https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=1000&auto=format&fit=crop'], condition: 'Neuf', city: 'Ariana', negotiable: false, description: 'Veste d\'hiver imperméable, taille M, jamais portée.', specs: [{label:'Taille',value:'M'},{label:'Couleur',value:'Bleu marine'},{label:'État',value:'Neuf avec étiquette'},{label:'Matière',value:'Imperméable'}], seller: { id: 104, name: 'Nour Hammami', image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=200&auto=format&fit=crop', phone: '20 456 789', memberSince: '2023', verified: true, rating: 4.9, responseTime: '~ 10 min' }, sellerId: 104 },
      { id: 5, title: 'Lot de livres - Génie Informatique', category: 'Livres', price: 60, images: ['https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=1000&auto=format&fit=crop'], condition: 'Bon état', city: 'Tunis, El Manar', negotiable: true, description: 'Lot de 8 livres référence en génie informatique.', specs: [{label:'Nombre',value:'8 livres'},{label:'Domaine',value:'Génie informatique'},{label:'Langue',value:'Français / Anglais'},{label:'État',value:'Bon état, annoté'}], seller: { id: 101, name: 'Amine Khelifi', image: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?q=80&w=200&auto=format&fit=crop', phone: '92 345 678', memberSince: '2023', verified: true, rating: 4.8, responseTime: '~ 15 min' }, sellerId: 101 },
      { id: 6, title: 'Étagère de rangement', category: 'Meubles', price: 90, images: ['https://images.unsplash.com/photo-1594620302200-9a762244a156?q=80&w=1000&auto=format&fit=crop'], condition: 'Bon état', city: 'Monastir', negotiable: true, description: 'Étagère 5 niveaux, facile à démonter.', specs: [{label:'Niveaux',value:'5'},{label:'Matériau',value:'Bois / Métal'},{label:'Dimensions',value:'180 x 80 x 40 cm'},{label:'Démontable',value:'Oui'}], seller: { id: 103, name: 'Mohamed Ayari', image: 'https://images.unsplash.com/photo-1531891437562-4301cf35b7e4?q=80&w=200&auto=format&fit=crop', phone: '27 890 123', memberSince: '2021', verified: false, rating: 4.3, responseTime: '~ 1 h' }, sellerId: 103 },
      { id: 7, title: 'Vélo de ville', category: 'Autres', price: 250, images: ['https://images.unsplash.com/photo-1485965120184-e220f721d03e?q=80&w=1000&auto=format&fit=crop'], condition: 'Très bon état', city: 'La Marsa', negotiable: true, description: 'Vélo confortable pour campus, pneus neufs, panier.', specs: [{label:'Type',value:'Vélo de ville'},{label:'Taille',value:'Adulte unique'},{label:'Pneus',value:'Neufs'},{label:'Accessoires',value:'Panier avant'}], seller: { id: 105, name: 'Karim Sassi', image: 'https://images.unsplash.com/photo-1531891437562-4301cf35b7e4?q=80&w=200&auto=format&fit=crop', phone: '98 234 567', memberSince: '2020', verified: true, rating: 4.7, responseTime: '~ 25 min' }, sellerId: 105 },
      { id: 8, title: 'Casque audio Bluetooth', category: 'Électronique', price: 70, images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1000&auto=format&fit=crop'], condition: 'Neuf', city: 'Sfax', negotiable: false, description: 'Casque Bluetooth, autonomie 20h, réduction de bruit.', specs: [{label:'Connectivité',value:'Bluetooth 5.0'},{label:'Autonomie',value:'20 heures'},{label:'Réduction de bruit',value:'Active'},{label:'État',value:'Neuf, emballé'}], seller: { id: 102, name: 'Salma Trabelsi', image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop', phone: '58 234 567', memberSince: '2022', verified: true, rating: 4.6, responseTime: '~ 40 min' }, sellerId: 102 },
    ];
  }

  private seedProviders(): ServiceProvider[] {
    return [
      { id: 1, name: 'Ahmed Sassi', profession: 'Développeur mobile', category: 'Développement', tier: 'Premium', rating: 4.9, reviews: 38, likes: 128, comments: 24, city: 'Tunis', phone: '22 334 455', experienceYears: 5, completedMissions: 62, responseTime: '~ 20 min', priceRange: 'À partir de 150 DT', memberSince: '2020', verified: true, description: "Développement d'applications Android & iOS pour étudiants et startups (Flutter, React Native).", services: ['Applications Android', 'Applications iOS', 'Refonte d\'apps existantes', 'Maintenance & support'], images: ['https://images.unsplash.com/photo-1568602471122-7832951cc4c5?q=80&w=1000&auto=format&fit=crop','https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=1000&auto=format&fit=crop'] },
      { id: 2, name: 'Mariem Chaabane', profession: 'Graphiste', category: 'Design', tier: 'Standard', rating: 4.7, reviews: 25, likes: 94, comments: 17, city: 'Sousse', phone: '55 667 788', experienceYears: 3, completedMissions: 47, responseTime: '~ 1 h', priceRange: 'À partir de 60 DT', memberSince: '2022', verified: true, description: 'Logos, affiches et identité visuelle pour projets étudiants.', services: ['Création de logo', 'Affiches & flyers', 'Identité visuelle', 'Contenus réseaux sociaux'], images: ['https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=1000&auto=format&fit=crop','https://images.unsplash.com/photo-1626785774573-4b799315345d?q=80&w=1000&auto=format&fit=crop'] },
      { id: 3, name: 'Firas Bouazizi', profession: 'Photographe', category: 'Photographie', tier: 'Gratuit', rating: 4.5, reviews: 14, likes: 61, comments: 9, city: 'Sfax', phone: '27 998 811', experienceYears: 2, completedMissions: 21, responseTime: '~ 2 h', priceRange: 'À partir de 50 DT', memberSince: '2023', verified: false, description: 'Shooting photo pour événements étudiants, portraits et projets.', services: ['Shooting portrait', 'Couverture d\'événements', 'Photos de projets', 'Retouche photo'], images: ['https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=1000&auto=format&fit=crop','https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=1000&auto=format&fit=crop'] },
      { id: 4, name: 'Ines Gharbi', profession: 'Formatrice en langues', category: 'Formation', tier: 'Standard', rating: 4.8, reviews: 33, likes: 143, comments: 31, city: 'Ariana', phone: '24 556 677', experienceYears: 6, completedMissions: 89, responseTime: '~ 40 min', priceRange: 'À partir de 40 DT/h', memberSince: '2019', verified: true, description: 'Cours d\'anglais et de français pour étudiants, préparation TOEFL/DELF.', services: ['Cours d\'anglais', 'Cours de français', 'Préparation TOEFL / DELF', 'Cours en ligne'], images: ['https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=1000&auto=format&fit=crop','https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?q=80&w=1000&auto=format&fit=crop'] },
      { id: 5, name: 'Walid Trabelsi', profession: 'Réparateur informatique', category: 'Réparation', tier: 'Premium', rating: 4.6, reviews: 29, likes: 77, comments: 12, city: 'Monastir', phone: '98 112 233', experienceYears: 8, completedMissions: 104, responseTime: '~ 15 min', priceRange: 'À partir de 30 DT', memberSince: '2018', verified: true, description: 'Réparation PC & smartphones, diagnostic gratuit, pièces garanties.', services: ['Réparation PC & Mac', 'Réparation smartphones', 'Récupération de données', 'Dépannage à domicile'], images: ['https://images.unsplash.com/photo-1531891437562-4301cf35b7e4?q=80&w=1000&auto=format&fit=crop','https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1000&auto=format&fit=crop'] },
    ];
  }

  private seedPosts(): FeedPost[] {
    const now = Date.now();
    return [
      { id: 1, authorId: 0, authorName: 'Salma Ben Ali', authorAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop', content: 'Coucou tout le monde ! Je cherche un co-locataire pour une chambre libre à Sfax près de la fac d\'économie. 150 DT/mois tout compris. Intéressés envoyez MP ! 😊', likesCount: 23, commentsCount: 4, likedByMe: false, createdAt: now - 1000 * 60 * 30 },
      { id: 2, authorId: 0, authorName: 'Karim Jaziri', authorAvatar: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?q=80&w=200&auto=format&fit=crop', content: 'Rappel : la journée portes ouvertes de l\'ISIMC c\'est demain à 10h. Venez nombreux, il y aura des stands des clubs et des snacks offerts 🎉', likesCount: 56, commentsCount: 9, likedByMe: false, createdAt: now - 1000 * 60 * 60 * 3 },
      { id: 3, authorId: 0, authorName: 'Mehdi Souissi', authorAvatar: 'https://images.unsplash.com/photo-1531891437562-4301cf35b7e4?q=80&w=200&auto=format&fit=crop', content: 'Vends un bon niveau de maths pour préparer les partiels L2 info. Disponible sur Tunis ou en ligne. DM pour infos 📚', likesCount: 12, commentsCount: 2, likedByMe: false, createdAt: now - 1000 * 60 * 60 * 7 },
    ];
  }
}
