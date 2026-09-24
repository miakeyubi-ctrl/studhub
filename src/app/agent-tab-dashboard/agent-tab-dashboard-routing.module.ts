import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AgentTabDashboardPage } from './agent-tab-dashboard.page';

const routes: Routes = [
  {
    path: '',
    component: AgentTabDashboardPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AgentTabDashboardPageRoutingModule {}
