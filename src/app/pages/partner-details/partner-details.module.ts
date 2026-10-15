import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { SkeletonModule } from '../../shared/skeleton/skeleton.module';
import { PartnerDetailsPageRoutingModule } from './partner-details-routing.module';
import { PartnerDetailsPage } from './partner-details.page';

@NgModule({
  imports: [
    CommonModule,
    IonicModule,
    TranslateModule,
    SkeletonModule,
    PartnerDetailsPageRoutingModule,
  ],
  declarations: [PartnerDetailsPage],
})
export class PartnerDetailsPageModule {}
