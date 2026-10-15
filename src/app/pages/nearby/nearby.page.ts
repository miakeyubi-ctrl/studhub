import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MockDataService, Product, Property } from '../../services/mock-data.service';

type NearbyKind = 'immo' | 'product';

@Component({
  selector: 'app-nearby',
  templateUrl: './nearby.page.html',
  styleUrls: ['./nearby.page.scss'],
  standalone: false,
})
export class NearbyPage implements OnInit {
  loading = true;
  kind: NearbyKind = 'immo';
  cityLabel = '';
  excludeId = 0;
  properties: Property[] = [];
  products: Product[] = [];
  fromApi = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private data: MockDataService,
  ) {}

  ngOnInit(): void {
    const q = this.route.snapshot.queryParamMap;
    this.kind = q.get('kind') === 'product' ? 'product' : 'immo';
    this.excludeId = Number(q.get('exclude') || 0) || 0;
    const city = (q.get('city') || '').trim();
    this.cityLabel = city || 'Tunisie';
    void this.load(city);
  }

  goBack(): void {
    if (window.history.length > 1) {
      this.location.back();
      return;
    }
    void this.router.navigateByUrl(this.kind === 'product' ? '/tabs/marketplace' : '/tabs/tab2');
  }

  openItem(id: number): void {
    if (!id) return;
    void this.router.navigate([this.kind === 'product' ? '/detailsproduit' : '/detailsimmo', id]);
  }

  private cityKey(raw: string): string {
    return (raw || '')
      .split(',')[0]
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  private async load(city: string): Promise<void> {
    this.loading = true;
    const cityParam = (city || '').split(',')[0].trim();

    if (this.kind === 'product') {
      // API first (filtre ville côté Nest), puis fallback local
      let list = await this.data.queryProducts({
        city: cityParam || undefined,
        limit: 24,
      });
      this.fromApi = list.length > 0;
      list = list.filter((p) => p.id !== this.excludeId);
      if (!list.length) {
        await this.data.loadProducts().catch(() => {});
        const key = this.cityKey(city);
        list = this.data.products.filter((p) => {
          if (p.id === this.excludeId) return false;
          if (!key) return true;
          const pk = this.cityKey(p.city);
          return pk.includes(key) || key.includes(pk);
        });
        if (!list.length) {
          list = this.data.products.filter((p) => p.id !== this.excludeId);
        }
      }
      this.products = list.slice(0, 24);
    } else {
      let list = await this.data.loadProperties({
        city: cityParam || undefined,
        limit: 24,
      });
      // loadProperties remplace le cache — si filtre trop strict, élargir via search
      list = (list || []).filter((p) => p.id !== this.excludeId);
      this.fromApi = list.length > 0;
      if (!list.length && cityParam) {
        list = await this.data.loadProperties({ search: cityParam, limit: 24 });
        list = (list || []).filter((p) => p.id !== this.excludeId);
      }
      if (!list.length) {
        await this.data.loadProperties().catch(() => {});
        const key = this.cityKey(city);
        list = this.data.properties.filter((p) => {
          if (p.id === this.excludeId) return false;
          if (!key) return true;
          const pk = this.cityKey(p.city);
          return pk.includes(key) || key.includes(pk);
        });
        if (!list.length) {
          list = this.data.properties.filter((p) => p.id !== this.excludeId);
        }
      }
      this.properties = list.slice(0, 24);
    }

    this.loading = false;
  }
}
