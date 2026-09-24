import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AgentTabMessagesPage } from './agent-tab-messages.page';

const routes: Routes = [
  {
    path: '',
    component: AgentTabMessagesPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AgentTabMessagesPageRoutingModule {}
