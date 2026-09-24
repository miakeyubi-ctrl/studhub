import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AgentTabGestionPage } from './agent-tab-gestion.page';

const routes: Routes = [
  {
    path: '',
    component: AgentTabGestionPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AgentTabGestionPageRoutingModule {}
