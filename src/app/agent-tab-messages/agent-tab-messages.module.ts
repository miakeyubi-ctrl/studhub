import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';

import { AgentTabMessagesPageRoutingModule } from './agent-tab-messages-routing.module';

import { AgentTabMessagesPage } from './agent-tab-messages.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TranslateModule,
    AgentTabMessagesPageRoutingModule
  ],
  declarations: [AgentTabMessagesPage]
})
export class AgentTabMessagesPageModule {}
