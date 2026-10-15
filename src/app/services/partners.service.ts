import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Partner {
  id: number;
  name: string;
  category: string;
  offer: string;
  description?: string | null;
  discount?: string | null;
  promoCode?: string | null;
  logoUrl: string;
  coverUrl?: string | null;
  websiteUrl?: string | null;
  phone?: string | null;
  email?: string | null;
  loginEmail?: string | null;
  city?: string | null;
  address?: string | null;
  validUntil?: string | null;
  isActive: boolean;
  sortOrder: number;
  viewsCount?: number;
  likesCount?: number;
  clicksCount?: number;
}

export interface PartnerStats {
  partners: number;
  views: number;
  likes: number;
  clicks: number;
}

export interface PartnerAnnouncement {
  id: number;
  partnerId: number;
  title: string;
  description?: string | null;
  discount?: string | null;
  promoCode?: string | null;
  imageUrl?: string | null;
  isActive: boolean;
  validUntil?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export type PartnerAnnouncementInput = {
  title: string;
  description?: string | null;
  discount?: string | null;
  promoCode?: string | null;
  imageUrl?: string | null;
  isActive?: boolean;
  validUntil?: string | null;
};

/** Champs éditables par l'admin (formulaire création / modification) */
export type PartnerInput = Omit<Partner, 'id' | 'viewsCount' | 'likesCount' | 'clicksCount'> & {
  password?: string;
};

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface PartnerList {
  items: Partner[];
  total: number;
}

@Injectable({ providedIn: 'root' })
export class PartnersService {
  private readonly baseUrl = `${environment.apiUrl}/partners`;
  private readonly _partners = new BehaviorSubject<Partner[]>([]);
  readonly partners$ = this._partners.asObservable();

  constructor(private http: HttpClient) {}

  // ---------- Public ----------

  async loadPartners(params: { search?: string; category?: string } = {}): Promise<Partner[]> {
    try {
      const res = await firstValueFrom(
        this.http.get<ApiResponse<PartnerList>>(this.baseUrl, { params: this.cleanParams(params) }),
      );
      const items = Array.isArray(res?.data?.items) ? res.data.items : [];
      if (!params.search && !params.category) this._partners.next(items);
      return items;
    } catch {
      if (!params.search && !params.category) this._partners.next([]);
      return [];
    }
  }

  async getPartner(id: number): Promise<Partner> {
    try {
      const res = await firstValueFrom(this.http.get<ApiResponse<Partner>>(`${this.baseUrl}/${id}`));
      if (res?.data) return res.data;
    } catch {
      /* fallthrough */
    }
    const cached = this._partners.value.find((p) => p.id === Number(id));
    if (cached) return { ...cached, viewsCount: (cached.viewsCount || 0) + 1 };
    throw new Error('PARTNER_NOT_FOUND');
  }

  async trackClick(id: number): Promise<Partial<Partner>> {
    try {
      const res = await firstValueFrom(
        this.http.post<ApiResponse<{ clicksCount: number; viewsCount: number; likesCount: number }>>(
          `${this.baseUrl}/${id}/click`,
          {},
        ),
      );
      return res.data;
    } catch {
      return { clicksCount: undefined };
    }
  }

  async trackLike(id: number): Promise<Partial<Partner>> {
    try {
      const res = await firstValueFrom(
        this.http.post<ApiResponse<{ likesCount: number; viewsCount: number; clicksCount: number }>>(
          `${this.baseUrl}/${id}/like`,
          {},
        ),
      );
      return res.data;
    } catch {
      return { likesCount: undefined };
    }
  }

  // ---------- Admin ----------

  async adminList(search?: string): Promise<Partner[]> {
    try {
      const res = await firstValueFrom(
        this.http.get<ApiResponse<PartnerList>>(`${this.baseUrl}/admin/all`, { params: this.cleanParams({ search }) }),
      );
      return Array.isArray(res?.data?.items) ? res.data.items : [];
    } catch {
      return [];
    }
  }

  async adminStats(): Promise<PartnerStats> {
    try {
      const res = await firstValueFrom(
        this.http.get<ApiResponse<PartnerStats>>(`${this.baseUrl}/admin/stats`),
      );
      return res.data;
    } catch {
      return { partners: 0, views: 0, likes: 0, clicks: 0 };
    }
  }

  statsFromList(list: Partner[]): PartnerStats {
    return {
      partners: list.length,
      views: list.reduce((s, p) => s + (Number(p.viewsCount) || 0), 0),
      likes: list.reduce((s, p) => s + (Number(p.likesCount) || 0), 0),
      clicks: list.reduce((s, p) => s + (Number(p.clicksCount) || 0), 0),
    };
  }

  async adminGet(id: number): Promise<Partner> {
    const res = await firstValueFrom(this.http.get<ApiResponse<Partner>>(`${this.baseUrl}/admin/${id}`));
    return res.data;
  }

  async create(input: PartnerInput): Promise<Partner> {
    const res = await firstValueFrom(this.http.post<ApiResponse<Partner>>(this.baseUrl, input));
    this.refreshPublicList();
    return res.data;
  }

  async update(id: number, input: Partial<PartnerInput>): Promise<Partner> {
    const res = await firstValueFrom(this.http.patch<ApiResponse<Partner>>(`${this.baseUrl}/${id}`, input));
    this.refreshPublicList();
    return res.data;
  }

  async remove(id: number): Promise<void> {
    await firstValueFrom(this.http.delete(`${this.baseUrl}/${id}`));
    this.refreshPublicList();
  }

  // ---------- Annonces partenaire (compte PARTNER uniquement) ----------

  async listPublicAnnouncements(partnerId: number): Promise<PartnerAnnouncement[]> {
    try {
      const res = await firstValueFrom(
        this.http.get<ApiResponse<PartnerAnnouncement[]>>(`${this.baseUrl}/${partnerId}/announcements`),
      );
      return Array.isArray(res?.data) ? res.data : [];
    } catch {
      return [];
    }
  }

  async listMyAnnouncements(): Promise<PartnerAnnouncement[]> {
    const res = await firstValueFrom(
      this.http.get<ApiResponse<PartnerAnnouncement[]>>(`${this.baseUrl}/me/announcements`),
    );
    return Array.isArray(res?.data) ? res.data : [];
  }

  async createAnnouncement(input: PartnerAnnouncementInput): Promise<PartnerAnnouncement> {
    const res = await firstValueFrom(
      this.http.post<ApiResponse<PartnerAnnouncement>>(`${this.baseUrl}/me/announcements`, input),
    );
    return res.data;
  }

  async updateAnnouncement(id: number, input: Partial<PartnerAnnouncementInput>): Promise<PartnerAnnouncement> {
    const res = await firstValueFrom(
      this.http.patch<ApiResponse<PartnerAnnouncement>>(`${this.baseUrl}/me/announcements/${id}`, input),
    );
    return res.data;
  }

  async removeAnnouncement(id: number): Promise<void> {
    await firstValueFrom(this.http.delete(`${this.baseUrl}/me/announcements/${id}`));
  }

  private refreshPublicList(): void {
    this.loadPartners().catch(() => undefined);
  }

  private cleanParams(params: Record<string, string | undefined>): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && String(v).trim() !== '') out[k] = String(v).trim();
    }
    return out;
  }
}
