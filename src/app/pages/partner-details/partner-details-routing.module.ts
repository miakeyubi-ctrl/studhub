import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PartnerDetailsPage } from './partner-details.page';

const routes: Routes = [
  { path: '', component: PartnerDetailsPage },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PartnerDetailsPageRoutingModule {}
