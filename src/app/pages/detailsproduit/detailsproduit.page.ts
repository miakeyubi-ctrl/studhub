import { Component, OnInit, NgZone } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import Splide from '@splidejs/splide';
import { MockDataService, Product } from '../../services/mock-data.service';
import { MessagesService } from '../../services/messages.service';

@Component({
  selector: 'app-detailsproduit',
  templateUrl: './detailsproduit.page.html',
  styleUrls: ['./detailsproduit.page.scss'],
  standalone: false
})
export class DetailsproduitPage implements OnInit {

  product?: Product;
  loading = true;
  isFavorite = false;
  activeSlide = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private zone: NgZone,
    private messagesService: MessagesService,
    public data: MockDataService
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.product = this.data.getProductById(id);

    setTimeout(() => {
      this.loading = false;
      setTimeout(() => this.mountGallery(), 0);
    }, 900);
  }

  private mountGallery(): void {
    if (!this.product) return;

    const splide = new Splide('#product-gallery', {
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
    if (this.product) {
      window.open(this.data.telLink(this.product.seller.phone), '_self');
    }
  }

  converser(): void {
    if (!this.product) return;

    const conversationId = this.messagesService.startConversation({
      name: this.product.seller.name,
      avatar: this.product.seller.image,
      role: 'Marketplace · ' + this.product.title
    });

    this.router.navigate(['/messages', conversationId]);
  }
}
