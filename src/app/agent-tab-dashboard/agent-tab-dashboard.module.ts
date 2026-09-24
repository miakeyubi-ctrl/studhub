import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';

import { AgentTabDashboardPageRoutingModule } from './agent-tab-dashboard-routing.module';

import { AgentTabDashboardPage } from './agent-tab-dashboard.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TranslateModule,
    AgentTabDashboardPageRoutingModule
  ],
  declarations: [AgentTabDashboardPage]
})
export class AgentTabDashboardPageModule {}
