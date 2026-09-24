import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MarketplacePage } from './marketplace.page';
import { MarketplacePageRoutingModule } from './marketplace-routing.module';
import { SkeletonModule } from '../shared/skeleton/skeleton.module';

@NgModule({
  imports: [
    IonicModule,
    TranslateModule,
    CommonModule,
    FormsModule,
    SkeletonModule,
    MarketplacePageRoutingModule
  ],
  declarations: [MarketplacePage]
})
export class MarketplacePageModule { }
