import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AgentProfilePage } from './agent-profile.page';

const routes: Routes = [
  {
    path: '',
    component: AgentProfilePage,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AgentProfilePageRoutingModule {}
