import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { AdminHomePageRoutingModule } from './admin-home-routing.module';
import { AdminHomePage } from './admin-home.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TranslateModule,
    AdminHomePageRoutingModule,
  ],
  declarations: [AdminHomePage],
})
export class AdminHomePageModule {}
