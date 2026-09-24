import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { OnbroadingPage } from './onbroading.page';

const routes: Routes = [
  {
    path: '',
    component: OnbroadingPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class OnbroadingPageRoutingModule {}
