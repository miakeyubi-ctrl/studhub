import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DetailsproduitPage } from './detailsproduit.page';
import { SkeletonModule } from '../../shared/skeleton/skeleton.module';

import { DetailsproduitPageRoutingModule } from './detailsproduit-routing.module';

@NgModule({
  imports: [
    IonicModule,
    TranslateModule,
    CommonModule,
    FormsModule,
    SkeletonModule,
    DetailsproduitPageRoutingModule
  ],
  declarations: [DetailsproduitPage]
})
export class DetailsproduitPageModule {}
