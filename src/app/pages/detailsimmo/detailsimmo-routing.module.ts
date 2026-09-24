import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DetailsimmoPage } from './detailsimmo.page';

const routes: Routes = [
  {
    path: '',
    component: DetailsimmoPage,
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DetailsimmoPageRoutingModule {}
