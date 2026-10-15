import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export type ReportTargetType = 'PROPERTY' | 'PRODUCT' | 'PROVIDER';

export interface UserReport {
  id: number;
  targetType: ReportTargetType;
  targetId: number;
  reason: string;
  details?: string | null;
  createdAt: string;
  targetTitle: string;
  targetRoute: string;
}

@Injectable({ providedIn: 'root' })
export class ReportsService {
  constructor(private http: HttpClient) {}

  async listMine(): Promise<UserReport[]> {
    const res: any = await firstValueFrom(
      this.http.get(`${environment.apiUrl}/reports/mine`),
    );
    const data = res?.success && Array.isArray(res?.data) ? res.data : res;
    if (!Array.isArray(data)) return [];
    return data.map((r: any) => ({
      id: Number(r.id),
      targetType: String(r.targetType || 'PROPERTY').toUpperCase() as ReportTargetType,
      targetId: Number(r.targetId),
      reason: String(r.reason || ''),
      details: r.details || null,
      createdAt: r.createdAt || new Date().toISOString(),
      targetTitle: String(r.targetTitle || `#${r.targetId}`),
      targetRoute: String(r.targetRoute || ''),
    }));
  }
}
