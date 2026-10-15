import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminPartnersPage } from './admin-partners.page';
import { AdminPartnerFormPage } from './admin-partner-form.page';

const routes: Routes = [
  { path: '', component: AdminPartnersPage },
  { path: 'new', component: AdminPartnerFormPage },
  { path: ':id', component: AdminPartnerFormPage },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminPartnersPageRoutingModule {}
