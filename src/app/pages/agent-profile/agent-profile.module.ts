import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { SkeletonModule } from '../../shared/skeleton/skeleton.module';
import { AgentProfilePageRoutingModule } from './agent-profile-routing.module';
import { AgentProfilePage } from './agent-profile.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TranslateModule,
    SkeletonModule,
    AgentProfilePageRoutingModule,
  ],
  declarations: [AgentProfilePage],
})
export class AgentProfilePageModule {}
