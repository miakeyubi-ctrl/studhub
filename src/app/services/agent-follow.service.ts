import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface FollowStatus {
  agentId: number;
  following: boolean;
  followersCount?: number;
}

const LOCAL_KEY = 'studhub-agent-follows-v1';

@Injectable({ providedIn: 'root' })
export class AgentFollowService {
  constructor(private http: HttpClient) {}

  async getStatus(agentId: number): Promise<FollowStatus> {
    if (!agentId) return { agentId: 0, following: false };
    try {
      const res: any = await firstValueFrom(
        this.http.get(`${environment.apiUrl}/agents/${agentId}/follow-status`),
      );
      const data = res?.data ?? res;
      if (data && typeof data.following === 'boolean') {
        this.setLocal(agentId, !!data.following);
        return {
          agentId,
          following: !!data.following,
          followersCount: Number(data.followersCount) || 0,
        };
      }
    } catch {}
    return { agentId, following: this.isLocal(agentId) };
  }

  async follow(agentId: number): Promise<FollowStatus> {
    try {
      const res: any = await firstValueFrom(
        this.http.post(`${environment.apiUrl}/agents/${agentId}/follow`, {}),
      );
      const data = res?.data ?? res;
      this.setLocal(agentId, true);
      return {
        agentId,
        following: true,
        followersCount: Number(data?.followersCount) || undefined,
      };
    } catch {
      this.setLocal(agentId, true);
      return { agentId, following: true };
    }
  }

  async unfollow(agentId: number): Promise<FollowStatus> {
    try {
      const res: any = await firstValueFrom(
        this.http.delete(`${environment.apiUrl}/agents/${agentId}/follow`),
      );
      const data = res?.data ?? res;
      this.setLocal(agentId, false);
      return {
        agentId,
        following: false,
        followersCount: Number(data?.followersCount) || undefined,
      };
    } catch {
      this.setLocal(agentId, false);
      return { agentId, following: false };
    }
  }

  private isLocal(agentId: number): boolean {
    return this.loadLocal().has(Number(agentId));
  }

  private setLocal(agentId: number, following: boolean): void {
    const set = this.loadLocal();
    if (following) set.add(Number(agentId));
    else set.delete(Number(agentId));
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify([...set]));
    } catch {}
  }

  private loadLocal(): Set<number> {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return new Set((Array.isArray(arr) ? arr : []).map(Number).filter(Boolean));
    } catch {
      return new Set();
    }
  }
}
