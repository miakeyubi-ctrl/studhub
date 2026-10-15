import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { PartnerDashboardPage } from './partner-dashboard.page';

const routes: Routes = [
  {
    path: '',
    component: PartnerDashboardPage,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PartnerDashboardPageRoutingModule {}
