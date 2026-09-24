import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DetailsstudservicesPage } from './detailsstudservices.page';
import { SkeletonModule } from '../../shared/skeleton/skeleton.module';

import { DetailsstudservicesPageRoutingModule } from './detailsstudservices-routing.module';

@NgModule({
  imports: [
    IonicModule,
    TranslateModule,
    CommonModule,
    FormsModule,
    SkeletonModule,
    DetailsstudservicesPageRoutingModule
  ],
  declarations: [DetailsstudservicesPage]
})
export class DetailsstudservicesPageModule {}
