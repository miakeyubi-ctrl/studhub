import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { AgentTabsPageRoutingModule } from './agent-tabs-routing.module';

import { AgentTabsPage } from './agent-tabs.page';

@NgModule({
  imports: [
    IonicModule,
    TranslateModule,
    CommonModule,
    FormsModule,
    AgentTabsPageRoutingModule
  ],
  declarations: [AgentTabsPage]
})
export class AgentTabsPageModule {}
