import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { SkeletonModule } from '../../shared/skeleton/skeleton.module';
import { AdminPartnersPageRoutingModule } from './admin-partners-routing.module';
import { AdminPartnersPage } from './admin-partners.page';
import { AdminPartnerFormPage } from './admin-partner-form.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TranslateModule,
    SkeletonModule,
    AdminPartnersPageRoutingModule,
  ],
  declarations: [AdminPartnersPage, AdminPartnerFormPage],
})
export class AdminPartnersPageModule {}
