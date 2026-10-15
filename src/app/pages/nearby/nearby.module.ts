import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { SkeletonModule } from '../../shared/skeleton/skeleton.module';
import { NearbyPageRoutingModule } from './nearby-routing.module';
import { NearbyPage } from './nearby.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TranslateModule,
    SkeletonModule,
    NearbyPageRoutingModule,
  ],
  declarations: [NearbyPage],
})
export class NearbyPageModule {}
