import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';

import { ActualitesPageRoutingModule } from './actualites-routing.module';

import { ActualitesPage } from './actualites.page';
import { SkeletonModule } from '../../shared/skeleton/skeleton.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TranslateModule,
    SkeletonModule,
    ActualitesPageRoutingModule
  ],
  declarations: [ActualitesPage]
})
export class ActualitesPageModule {}
