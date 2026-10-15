import {
  AfterViewInit,
  Component,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  SimpleChanges,
} from '@angular/core';
import Splide from '@splidejs/splide';

@Component({
  selector: 'app-photo-gallery',
  templateUrl: './photo-gallery.component.html',
  styleUrls: ['./photo-gallery.component.scss'],
  standalone: false,
})
export class PhotoGalleryComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() images: string[] = [];
  @Input() title = '';
  @Input() galleryId = 'photo-gallery';

  activeSlide = 0;
  allPhotosOpen = false;
  lightboxOpen = false;
  lightboxStart = 0;

  private mainSplide?: Splide;
  private lightboxSplide?: Splide;

  constructor(private zone: NgZone) {}

  get hasMultiple(): boolean {
    return this.images.length > 1;
  }

  get currentPhotoNumber(): number {
    const len = this.images.length;
    if (!len) return 0;
    return ((this.activeSlide % len) + len) % len + 1;
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.mountMain(), 0);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['images'] && !changes['images'].firstChange) {
      setTimeout(() => this.mountMain(), 0);
    }
  }

  ngOnDestroy(): void {
    this.destroyMain();
    this.destroyLightbox();
  }

  prevPhoto(event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();
    this.mainSplide?.go('<');
  }

  nextPhoto(event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();
    this.mainSplide?.go('>');
  }

  openAllPhotos(event?: Event): void {
    event?.stopPropagation();
    if (!this.images.length) return;
    this.allPhotosOpen = true;
    this.lightboxOpen = false;
  }

  closeAllPhotos(): void {
    this.allPhotosOpen = false;
    this.lightboxOpen = false;
    this.destroyLightbox();
  }

  openLightbox(index: number): void {
    this.lightboxStart = index;
    this.lightboxOpen = true;
    setTimeout(() => this.mountLightbox(), 60);
  }

  backToGrid(): void {
    this.lightboxOpen = false;
    this.destroyLightbox();
  }

  private mountMain(): void {
    if (!this.images.length) return;
    const root = document.getElementById(this.galleryId);
    if (!root) {
      setTimeout(() => this.mountMain(), 80);
      return;
    }

    this.destroyMain();
    this.activeSlide = 0;

    const multi = this.images.length > 1;
    this.mainSplide = new Splide(root, {
      type: multi ? 'loop' : 'slide',
      perPage: 1,
      perMove: 1,
      arrows: false,
      pagination: multi,
      drag: multi,
      speed: 400,
      height: '19rem',
      rewind: multi,
      gap: 0,
      noDrag: 'button, a, ion-button, .photo-gallery__badge',
    }).mount();

    this.mainSplide.on('moved', (index: number) => {
      this.zone.run(() => this.setActiveIndex(index));
    });
  }

  private mountLightbox(): void {
    const root = document.getElementById(`${this.galleryId}-lightbox`);
    if (!root) {
      setTimeout(() => this.mountLightbox(), 80);
      return;
    }

    this.destroyLightbox();
    const multi = this.images.length > 1;
    this.lightboxSplide = new Splide(root, {
      type: multi ? 'loop' : 'slide',
      start: this.lightboxStart,
      perPage: 1,
      perMove: 1,
      arrows: multi,
      pagination: multi,
      height: '100%',
      drag: multi,
    }).mount();
  }

  private setActiveIndex(raw: number): void {
    const len = this.images.length;
    this.activeSlide = len ? ((raw % len) + len) % len : 0;
  }

  private destroyMain(): void {
    try {
      this.mainSplide?.destroy(true);
    } catch {}
    this.mainSplide = undefined;
  }

  private destroyLightbox(): void {
    try {
      this.lightboxSplide?.destroy(true);
    } catch {}
    this.lightboxSplide = undefined;
  }
}
