import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { PartnerLoginPage } from './partner-login.page';

const routes: Routes = [
  {
    path: '',
    component: PartnerLoginPage,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PartnerLoginPageRoutingModule {}
