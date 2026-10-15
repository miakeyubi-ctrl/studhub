import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { AgentEditProfilePageRoutingModule } from './agent-edit-profile-routing.module';
import { AgentEditProfilePage } from './agent-edit-profile.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TranslateModule,
    AgentEditProfilePageRoutingModule,
  ],
  declarations: [AgentEditProfilePage],
})
export class AgentEditProfilePageModule {}
