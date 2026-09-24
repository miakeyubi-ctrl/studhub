import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';

import { AgentTabProfilePageRoutingModule } from './agent-tab-profile-routing.module';

import { AgentTabProfilePage } from './agent-tab-profile.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TranslateModule,
    AgentTabProfilePageRoutingModule
  ],
  declarations: [AgentTabProfilePage]
})
export class AgentTabProfilePageModule {}
