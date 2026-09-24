import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AgentLoginPage } from './agent-login.page';

const routes: Routes = [
  {
    path: '',
    component: AgentLoginPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AgentLoginPageRoutingModule {}
