import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { SkeletonModule } from '../../shared/skeleton/skeleton.module';
import { PartnersPageRoutingModule } from './partners-routing.module';
import { PartnersPage } from './partners.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TranslateModule,
    SkeletonModule,
    PartnersPageRoutingModule,
  ],
  declarations: [PartnersPage],
})
export class PartnersPageModule {}
