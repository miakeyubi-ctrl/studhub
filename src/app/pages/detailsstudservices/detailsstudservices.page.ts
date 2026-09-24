import { Component, OnInit, NgZone } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import Splide from '@splidejs/splide';
import { MockDataService, ServiceProvider } from '../../services/mock-data.service';

@Component({
  selector: 'app-detailsstudservices',
  templateUrl: './detailsstudservices.page.html',
  styleUrls: ['./detailsstudservices.page.scss'],
  standalone: false
})
export class DetailsstudservicesPage implements OnInit {

  prestataire?: ServiceProvider;
  loading = true;
  isFavorite = false;
  activeSlide = 0;

  constructor(
    private route: ActivatedRoute,
    private zone: NgZone,
    public data: MockDataService
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.prestataire = this.data.getPrestataireById(id);

    setTimeout(() => {
      this.loading = false;
      setTimeout(() => this.mountGallery(), 0);
    }, 900);
  }

  private mountGallery(): void {
    if (!this.prestataire) return;

    const splide = new Splide('#service-gallery', {
      type: 'loop',
      perPage: 1,
      arrows: false,
      pagination: false,
      height: '19rem'
    }).mount();

    splide.on('move', (newIndex: number) => {
      this.zone.run(() => this.activeSlide = newIndex);
    });
  }

  toggleFavorite(): void {
    this.isFavorite = !this.isFavorite;
  }

  call(): void {
    if (this.prestataire) {
      window.open(this.data.telLink(this.prestataire.phone), '_self');
    }
  }

  whatsapp(): void {
    if (this.prestataire) {
      window.open(this.data.whatsappLink(this.prestataire.phone), '_blank');
    }
  }
}
