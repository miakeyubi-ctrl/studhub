import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';

import { AgentRegisterPageRoutingModule } from './agent-register-routing.module';

import { AgentRegisterPage } from './agent-register.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TranslateModule,
    AgentRegisterPageRoutingModule
  ],
  declarations: [AgentRegisterPage]
})
export class AgentRegisterPageModule {}
