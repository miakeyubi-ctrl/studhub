import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AgentRegisterPage } from './agent-register.page';

const routes: Routes = [
  {
    path: '',
    component: AgentRegisterPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AgentRegisterPageRoutingModule {}
