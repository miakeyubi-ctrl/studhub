import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { HelpSupportPageRoutingModule } from './help-support-routing.module';
import { HelpSupportPage } from './help-support.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TranslateModule,
    HelpSupportPageRoutingModule,
  ],
  declarations: [HelpSupportPage],
})
export class HelpSupportPageModule {}
