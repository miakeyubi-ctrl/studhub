import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DetailsimmoPage } from './detailsimmo.page';
import { SkeletonModule } from '../../shared/skeleton/skeleton.module';

import { DetailsimmoPageRoutingModule } from './detailsimmo-routing.module';

@NgModule({
  imports: [
    IonicModule,
    TranslateModule,
    CommonModule,
    FormsModule,
    SkeletonModule,
    DetailsimmoPageRoutingModule
  ],
  declarations: [DetailsimmoPage]
})
export class DetailsimmoPageModule {}
