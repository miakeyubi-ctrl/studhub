import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminAccountsPage } from './admin-accounts.page';

const routes: Routes = [{ path: '', component: AdminAccountsPage }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminAccountsPageRoutingModule {}
