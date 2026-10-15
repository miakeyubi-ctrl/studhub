import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { UNIVERSITIES, UniversityOption } from '../data/universities';

export interface UniversityStat {
  id: string;
  name: string;
  short: string;
  studentsCount: number;
}

@Injectable({ providedIn: 'root' })
export class UniversitiesService {
  constructor(private http: HttpClient) {}

  list(): UniversityOption[] {
    return UNIVERSITIES;
  }

  async stats(): Promise<UniversityStat[]> {
    try {
      const res = await firstValueFrom(
        this.http.get<UniversityStat[] | { data: UniversityStat[] }>(
          `${environment.apiUrl}/users/universities/stats`,
        ),
      );
      const list = Array.isArray(res) ? res : (res as { data: UniversityStat[] })?.data;
      if (Array.isArray(list) && list.length) return list;
    } catch {
      /* fallback local */
    }
    return UNIVERSITIES.map((u) => ({
      id: u.id,
      name: u.name,
      short: u.short,
      studentsCount: 0,
    }));
  }
}
