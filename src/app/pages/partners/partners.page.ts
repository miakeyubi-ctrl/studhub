import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Partner, PartnersService } from '../../services/partners.service';

@Component({
  selector: 'app-partners',
  templateUrl: './partners.page.html',
  styleUrls: ['./partners.page.scss'],
  standalone: false,
})
export class PartnersPage implements OnInit {
  loading = true;
  error = false;
  search = '';
  activeCategory = '';
  partners: Partner[] = [];
  isAdmin = false;

  constructor(
    private location: Location,
    private router: Router,
    private partnersService: PartnersService,
    private auth: AuthService,
  ) {}

  ngOnInit(): void {
    this.isAdmin = this.auth.isAdmin;
    void this.load();
  }

  ionViewWillEnter(): void {
    this.isAdmin = this.auth.isAdmin;
  }

  async load(): Promise<void> {
    this.loading = true;
    this.error = false;
    try {
      this.partners = await this.partnersService.loadPartners();
    } catch {
      this.error = true;
    } finally {
      this.loading = false;
    }
  }

  async doRefresh(event: CustomEvent): Promise<void> {
    await this.load();
    (event.target as HTMLIonRefresherElement).complete();
  }

  get categories(): string[] {
    return Array.from(new Set(this.partners.map(p => p.category))).sort();
  }

  get filtered(): Partner[] {
    const q = this.search.trim().toLowerCase();
    return this.partners.filter(p => {
      if (this.activeCategory && p.category !== this.activeCategory) return false;
      if (!q) return true;
      return [p.name, p.offer, p.category, p.city ?? '']
        .some(v => v.toLowerCase().includes(q));
    });
  }

  setCategory(category: string): void {
    this.activeCategory = category;
  }

  openPartner(id: number): void {
    void this.router.navigate(['/partners', id]);
  }

  managePartners(): void {
    void this.router.navigate(['/admin/partners']);
  }

  addPartner(): void {
    void this.router.navigate(['/admin/partners/new']);
  }

  goBack(): void {
    this.location.back();
  }
}
