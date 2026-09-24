import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';

import { AgentLoginPageRoutingModule } from './agent-login-routing.module';

import { AgentLoginPage } from './agent-login.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TranslateModule,
    AgentLoginPageRoutingModule
  ],
  declarations: [AgentLoginPage]
})
export class AgentLoginPageModule {}
