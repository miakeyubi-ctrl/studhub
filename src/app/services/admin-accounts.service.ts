import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AdminAccount {
  kind: 'user' | 'agent';
  id: number;
  email: string;
  displayName: string;
  phone?: string | null;
  university?: string | null;
  role: string;
  avatarUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  blockedAt?: string | null;
  isBlocked: boolean;
}

@Injectable({ providedIn: 'root' })
export class AdminAccountsService {
  constructor(private http: HttpClient) {}

  async list(search = '', kind: 'user' | 'agent' | 'all' = 'all'): Promise<AdminAccount[]> {
    let params = new HttpParams();
    if (search.trim()) params = params.set('search', search.trim());
    if (kind && kind !== 'all') params = params.set('kind', kind);
    const res: any = await firstValueFrom(
      this.http.get(`${environment.apiUrl}/users/admin/accounts`, { params }),
    );
    const raw = res?.data ?? res;
    return Array.isArray(raw) ? raw : [];
  }

  async setBlocked(kind: 'user' | 'agent', id: number, blocked: boolean): Promise<void> {
    const action = blocked ? 'block' : 'unblock';
    await firstValueFrom(
      this.http.patch(`${environment.apiUrl}/users/admin/${kind}/${id}/${action}`, {}),
    );
  }
}
