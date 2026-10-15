import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HelpSupportPage } from './help-support.page';

const routes: Routes = [
  { path: '', component: HelpSupportPage },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class HelpSupportPageRoutingModule {}
