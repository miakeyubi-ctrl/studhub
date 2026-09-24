import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';

import { MessagesPageRoutingModule } from './messages-routing.module';
import { SkeletonModule } from '../../shared/skeleton/skeleton.module';

import { MessagesPage } from './messages.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TranslateModule,
    SkeletonModule,
    MessagesPageRoutingModule
  ],
  declarations: [MessagesPage]
})
export class MessagesPageModule {}
