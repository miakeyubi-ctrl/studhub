import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PrivacySecurityPage } from './privacy-security.page';

const routes: Routes = [
  { path: '', component: PrivacySecurityPage },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PrivacySecurityPageRoutingModule {}
