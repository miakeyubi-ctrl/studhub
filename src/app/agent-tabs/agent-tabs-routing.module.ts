import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AgentTabsPage } from './agent-tabs.page';

const routes: Routes = [
  {
    path: '',
    component: AgentTabsPage,
    children: [
      {
        path: 'dashboard',
        loadChildren: () => import('../agent-tab-dashboard/agent-tab-dashboard.module').then(m => m.AgentTabDashboardPageModule)
      },
      {
        path: 'gestion',
        loadChildren: () => import('../agent-tab-gestion/agent-tab-gestion.module').then(m => m.AgentTabGestionPageModule)
      },
      {
        path: 'messages',
        loadChildren: () => import('../agent-tab-messages/agent-tab-messages.module').then(m => m.AgentTabMessagesPageModule)
      },
      {
        path: 'profil',
        loadChildren: () => import('../agent-tab-profile/agent-tab-profile.module').then(m => m.AgentTabProfilePageModule)
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
})
export class AgentTabsPageRoutingModule {}
