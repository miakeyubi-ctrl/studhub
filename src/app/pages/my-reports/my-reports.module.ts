import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { MyReportsPageRoutingModule } from './my-reports-routing.module';
import { MyReportsPage } from './my-reports.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TranslateModule,
    MyReportsPageRoutingModule,
  ],
  declarations: [MyReportsPage],
})
export class MyReportsPageModule {}
