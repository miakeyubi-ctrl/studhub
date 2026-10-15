import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { AgentEditProfilePage } from './agent-edit-profile.page';

const routes: Routes = [
  { path: '', component: AgentEditProfilePage },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AgentEditProfilePageRoutingModule {}
