import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { PartnerDashboardPageRoutingModule } from './partner-dashboard-routing.module';
import { PartnerDashboardPage } from './partner-dashboard.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TranslateModule,
    PartnerDashboardPageRoutingModule,
  ],
  declarations: [PartnerDashboardPage],
})
export class PartnerDashboardPageModule {}
