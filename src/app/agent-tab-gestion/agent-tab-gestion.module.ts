import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';

import { AgentTabGestionPageRoutingModule } from './agent-tab-gestion-routing.module';

import { AgentTabGestionPage } from './agent-tab-gestion.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TranslateModule,
    AgentTabGestionPageRoutingModule
  ],
  declarations: [AgentTabGestionPage]
})
export class AgentTabGestionPageModule {}
