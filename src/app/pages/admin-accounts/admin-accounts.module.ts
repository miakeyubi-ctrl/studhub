import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { SkeletonModule } from '../../shared/skeleton/skeleton.module';
import { AdminAccountsPageRoutingModule } from './admin-accounts-routing.module';
import { AdminAccountsPage } from './admin-accounts.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TranslateModule,
    SkeletonModule,
    AdminAccountsPageRoutingModule,
  ],
  declarations: [AdminAccountsPage],
})
export class AdminAccountsPageModule {}
