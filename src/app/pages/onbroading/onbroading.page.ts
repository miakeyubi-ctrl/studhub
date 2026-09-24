import { Component, OnInit, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import Splide from '@splidejs/splide';
import { ONBOARDING_SEEN_KEY } from '../../guards/onboarding.guard';

@Component({
  selector: 'app-onbroading',
  templateUrl: './onbroading.page.html',
  styleUrls: ['./onbroading.page.scss'],
  standalone:false
})
export class OnbroadingPage implements OnInit, AfterViewInit {

  constructor(private router: Router) {}

  ngOnInit() {}

  ngAfterViewInit(): void {

    new Splide('#onboarding-slider', {
      type: 'slide',
      perPage: 1,
      pagination: true,
      arrows: false,
      autoplay: false,
      interval: 4000,
    }).mount();

  }

  enterApp(): void {
    localStorage.setItem(ONBOARDING_SEEN_KEY, 'true');
    this.router.navigateByUrl('/tabs/tab1', { replaceUrl: true });
  }

}
