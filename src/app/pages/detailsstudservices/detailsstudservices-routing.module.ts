import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DetailsstudservicesPage } from './detailsstudservices.page';

const routes: Routes = [
  {
    path: '',
    component: DetailsstudservicesPage,
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DetailsstudservicesPageRoutingModule {}
