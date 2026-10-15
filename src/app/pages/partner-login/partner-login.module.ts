import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { PartnerLoginPageRoutingModule } from './partner-login-routing.module';
import { PartnerLoginPage } from './partner-login.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TranslateModule,
    PartnerLoginPageRoutingModule,
  ],
  declarations: [PartnerLoginPage],
})
export class PartnerLoginPageModule {}
