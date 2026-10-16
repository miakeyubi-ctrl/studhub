import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Reservation {
  id: number;
  title: string;
  city: string;
  image: string;
  dateDebut: string;
  dateFin: string;
  price: number;
  status: 'confirmee' | 'attente' | 'terminee';
}

@Injectable({ providedIn: 'root' })
export class ReservationsService {
  constructor(private http: HttpClient) {}

  async loadMine(): Promise<Reservation[]> {
    const res: any = await firstValueFrom(this.http.get(`${environment.apiUrl}/reservations/mine`));
    const data = res?.data ?? res;
    return Array.isArray(data) ? data : [];
  }

  async create(propertyId: number): Promise<Reservation> {
    const res: any = await firstValueFrom(
      this.http.post(`${environment.apiUrl}/reservations`, { propertyId }),
    );
    return (res?.data ?? res) as Reservation;
  }
}
