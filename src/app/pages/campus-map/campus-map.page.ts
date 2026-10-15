import { Component, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import * as L from 'leaflet';
import { UNIVERSITIES, UniversityOption } from '../../data/universities';
import { MockDataService, Property } from '../../services/mock-data.service';
import { UniversitiesService } from '../../services/universities.service';
import { resolveMediaUrl } from '../../utils/media-url.util';

export type CampusPin = UniversityOption & { studentsCount: number };

export interface MapListingCard {
  property: Property;
  lat: number;
  lng: number;
  distKm: number;
  photo: string;
  price: number;
}

const AREA_COORDS: { key: string; lat: number; lng: number }[] = [
  { key: 'el manar', lat: 36.8185, lng: 10.152 },
  { key: 'manar', lat: 36.8185, lng: 10.152 },
  { key: 'la marsa', lat: 36.8782, lng: 10.3248 },
  { key: 'marsa', lat: 36.8782, lng: 10.3248 },
  { key: 'el menzah', lat: 36.8455, lng: 10.1705 },
  { key: 'menzah', lat: 36.8455, lng: 10.1705 },
  { key: 'soukra', lat: 36.882, lng: 10.186 },
  { key: 'ariana', lat: 36.8665, lng: 10.1647 },
  { key: 'manouba', lat: 36.808, lng: 10.097 },
  { key: 'carthage', lat: 36.852, lng: 10.323 },
  { key: 'tunis', lat: 36.8065, lng: 10.1815 },
  { key: 'sahloul', lat: 35.841, lng: 10.598 },
  { key: 'sousse', lat: 35.8256, lng: 10.6411 },
  { key: 'sfax', lat: 34.7406, lng: 10.7603 },
  { key: 'monastir', lat: 35.777, lng: 10.826 },
];

@Component({
  selector: 'app-campus-map',
  templateUrl: './campus-map.page.html',
  styleUrls: ['./campus-map.page.scss'],
  standalone: false,
})
export class CampusMapPage implements OnDestroy {
  campuses: CampusPin[] = UNIVERSITIES.map((u) => ({ ...u, studentsCount: 0 }));
  selectedCampus: CampusPin | null = null;
  nearbyCount = 0;
  loading = true;
  properties: Property[] = [];
  asTab = false;
  filtersOpen = false;
  cards: MapListingCard[] = [];
  selectedPropertyId: number | null = null;

  filterCategory = '';
  filterMaxPrice: number | null = null;
  filterMaxKm = 8;
  readonly pricePresets = [200, 300, 400, 500, 800];
  readonly kmPresets = [3, 5, 8, 15];
  readonly categories = ['Studios', 'Colocations', 'Résidences', 'Chambres'];

  private map?: L.Map;
  private campusLayer?: L.LayerGroup;
  private propertyLayer?: L.LayerGroup;
  private markersById = new Map<number, L.Marker>();
  private placed: { property: Property; lat: number; lng: number; distKm: number }[] = [];

  constructor(
    private data: MockDataService,
    private universities: UniversitiesService,
    private router: Router,
  ) {}

  ionViewWillEnter(): void {
    this.asTab = this.router.url.includes('/tabs/campus-map');
    void this.boot();
  }

  ionViewDidLeave(): void {
    this.destroyMap();
  }

  ngOnDestroy(): void {
    this.destroyMap();
  }

  goBack(): void {
    void this.router.navigateByUrl('/tabs/tab2');
  }

  selectCampus(campus: CampusPin | null): void {
    this.selectedCampus = campus;
    this.selectedPropertyId = null;
    this.refreshPropertyMarkers();
    if (!this.map) return;
    if (campus) {
      this.map.flyTo([campus.lat, campus.lng], 14, { duration: 0.65 });
    } else {
      this.map.flyTo([36.84, 10.18], 11.5, { duration: 0.65 });
    }
  }

  toggleFilters(): void {
    this.filtersOpen = !this.filtersOpen;
  }

  setCategory(cat: string): void {
    this.filterCategory = this.filterCategory === cat ? '' : cat;
    this.refreshPropertyMarkers();
  }

  setMaxPrice(price: number | null): void {
    this.filterMaxPrice = this.filterMaxPrice === price ? null : price;
    this.refreshPropertyMarkers();
  }

  setMaxKm(km: number): void {
    this.filterMaxKm = km;
    this.refreshPropertyMarkers();
  }

  resetFilters(): void {
    this.filterCategory = '';
    this.filterMaxPrice = null;
    this.filterMaxKm = 8;
    this.refreshPropertyMarkers();
  }

  get activeFilterCount(): number {
    let n = 0;
    if (this.filterCategory) n += 1;
    if (this.filterMaxPrice != null) n += 1;
    if (this.filterMaxKm !== 8) n += 1;
    return n;
  }

  openProperty(id: number): void {
    void this.router.navigate(['/detailsimmo', id]);
  }

  selectCard(card: MapListingCard): void {
    this.selectedPropertyId = card.property.id;
    this.map?.flyTo([card.lat, card.lng], Math.max(this.map.getZoom(), 14.5), {
      duration: 0.45,
    });
    const marker = this.markersById.get(card.property.id);
    marker?.openPopup();
    this.scrollCardIntoView(card.property.id);
  }

  trackCard(_: number, card: MapListingCard): number {
    return card.property.id;
  }

  private async boot(): Promise<void> {
    this.loading = true;
    try {
      const [props, stats] = await Promise.all([
        this.data.loadProperties({ limit: 80 }).catch(() => [] as Property[]),
        this.universities.stats(),
      ]);
      this.properties = props?.length ? props : this.data.properties || [];
      if (!this.properties.length) {
        await this.data.loadProperties().catch(() => {});
        this.properties = this.data.properties || [];
      }
      const byId = new Map(stats.map((s) => [s.id, s.studentsCount]));
      this.campuses = UNIVERSITIES.map((u) => ({
        ...u,
        studentsCount: byId.get(u.id) || 0,
      }));
      if (this.selectedCampus) {
        this.selectedCampus =
          this.campuses.find((c) => c.id === this.selectedCampus!.id) || null;
      }
    } catch {
      this.properties = this.data.properties || [];
    }
    this.placeProperties();
    this.loading = false;
    setTimeout(() => this.initMap(), 80);
  }

  private initMap(): void {
    const el = document.getElementById('campus-map');
    if (!el) return;
    this.destroyMap();

    this.map = L.map(el, {
      zoomControl: false,
      attributionControl: true,
    }).setView([36.84, 10.18], 11.5);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png', {
      maxZoom: 20,
      attribution: '&copy; OpenStreetMap / OSM France',
    }).addTo(this.map);

    L.control.zoom({ position: 'bottomright' }).addTo(this.map);

    this.campusLayer = L.layerGroup().addTo(this.map);
    this.propertyLayer = L.layerGroup().addTo(this.map);

    for (const c of this.campuses) {
      const icon = L.divIcon({
        className: 'campus-marker',
        html:
          `<div class="pin uni">` +
          `<span>${c.short}</span>` +
          `<em>${c.studentsCount}</em>` +
          `</div>`,
        iconSize: [72, 28],
        iconAnchor: [36, 14],
      });
      L.marker([c.lat, c.lng], { icon })
        .bindPopup(
          `<strong>${c.name}</strong><br/>` +
            `<small>${c.city}</small><br/>` +
            `<small>${c.studentsCount} étudiant(s) StudHub</small>`,
        )
        .on('click', () => this.selectCampus(c))
        .addTo(this.campusLayer!);
    }

    this.refreshPropertyMarkers();
    setTimeout(() => this.map?.invalidateSize(), 200);
  }

  private placeProperties(): void {
    this.placed = this.properties.map((p, i) => {
      const base = this.resolveCoords(p);
      const hasReal =
        Number.isFinite(Number((p as any).latitude)) &&
        Number.isFinite(Number((p as any).longitude));
      const jitter = hasReal ? 0.0008 : 0.004;
      const lat = base.lat + Math.sin(i * 2.1) * jitter;
      const lng = base.lng + Math.cos(i * 1.7) * jitter;
      return { property: p, lat, lng, distKm: 0 };
    });
  }

  private refreshPropertyMarkers(): void {
    if (!this.propertyLayer) {
      this.cards = this.buildFilteredList().map((item) => this.toCard(item));
      this.nearbyCount = this.cards.length;
      return;
    }
    this.propertyLayer.clearLayers();
    this.markersById.clear();

    const list = this.buildFilteredList();
    this.nearbyCount = list.length;
    this.cards = list.map((item) => this.toCard(item));

    for (const item of list) {
      const price = Math.round(Number(item.property.price) || 0);
      const photo = this.photoUrl(item.property);
      const selected = this.selectedPropertyId === item.property.id;
      const icon = L.divIcon({
        className: 'immo-marker',
        html:
          `<div class="airbnb-pin${selected ? ' is-selected' : ''}">` +
          `<div class="airbnb-pin__photo" style="background-image:url('${photo}')"></div>` +
          `<div class="airbnb-pin__price">${price}&nbsp;DT</div>` +
          `</div>`,
        iconSize: [72, 86],
        iconAnchor: [36, 86],
      });
      const marker = L.marker([item.lat, item.lng], { icon, riseOnHover: true });
      const distLabel = this.selectedCampus
        ? `<span class="map-card__dist">${item.distKm.toFixed(1)} km</span>`
        : '';
      marker.bindPopup(
        `<button type="button" class="map-card" data-property-id="${item.property.id}">` +
          `<img class="map-card__img" src="${photo}" alt="" referrerpolicy="no-referrer" />` +
          `<div class="map-card__body">` +
          `<strong>${this.escape(item.property.title)}</strong>` +
          `<span>${price} DT · ${this.escape(item.property.city)}</span>` +
          distLabel +
          `</div></button>`,
        { maxWidth: 240, className: 'airbnb-popup' },
      );
      marker.on('click', () => {
        this.selectedPropertyId = item.property.id;
        this.scrollCardIntoView(item.property.id);
      });
      marker.on('popupopen', () => {
        const btn = document.querySelector(
          `.map-card[data-property-id="${item.property.id}"]`,
        ) as HTMLButtonElement | null;
        if (!btn) return;
        btn.onclick = (ev) => {
          ev.preventDefault();
          this.openProperty(item.property.id);
        };
      });
      marker.addTo(this.propertyLayer!);
      this.markersById.set(item.property.id, marker);
    }
  }

  private buildFilteredList(): {
    property: Property;
    lat: number;
    lng: number;
    distKm: number;
  }[] {
    const focus = this.selectedCampus;
    let list = this.placed.map((item) => {
      const distKm = focus
        ? this.haversine(focus.lat, focus.lng, item.lat, item.lng)
        : 0;
      return { ...item, distKm };
    });

    if (this.filterCategory) {
      list = list.filter((x) => x.property.category === this.filterCategory);
    }
    if (this.filterMaxPrice != null) {
      list = list.filter((x) => Number(x.property.price) <= this.filterMaxPrice!);
    }
    if (focus) {
      list = list
        .filter((x) => x.distKm <= this.filterMaxKm)
        .sort((a, b) => a.distKm - b.distKm);
    }
    return list;
  }

  private toCard(item: {
    property: Property;
    lat: number;
    lng: number;
    distKm: number;
  }): MapListingCard {
    return {
      ...item,
      photo: resolveMediaUrl(item.property.images?.[0]),
      price: Math.round(Number(item.property.price) || 0),
    };
  }

  private scrollCardIntoView(id: number): void {
    setTimeout(() => {
      const el = document.getElementById(`map-listing-${id}`);
      el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }, 60);
  }

  private photoUrl(p: Property): string {
    return this.escapeAttr(resolveMediaUrl(p.images?.[0]));
  }

  private escapeAttr(s: string): string {
    return (s || '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  private resolveCoords(p: Property): { lat: number; lng: number } {
    const lat = Number((p as any).latitude);
    const lng = Number((p as any).longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng };
    }
    const hay = `${p.address || ''} ${p.city || ''} ${p.title || ''}`
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    for (const a of AREA_COORDS) {
      if (hay.includes(a.key)) return { lat: a.lat, lng: a.lng };
    }
    return { lat: 36.8065, lng: 10.1815 };
  }

  private haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private escape(s: string): string {
    return (s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private destroyMap(): void {
    if (this.map) {
      this.map.remove();
      this.map = undefined;
      this.campusLayer = undefined;
      this.propertyLayer = undefined;
      this.markersById.clear();
    }
  }
}
