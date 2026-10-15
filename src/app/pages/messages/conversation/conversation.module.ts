import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';

import { ConversationPageRoutingModule } from './conversation-routing.module';

import { ConversationPage } from './conversation.page';
import { VoiceNotePlayerComponent } from '../../../shared/voice-note-player/voice-note-player.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TranslateModule,
    ConversationPageRoutingModule
  ],
  declarations: [ConversationPage, VoiceNotePlayerComponent]
})
export class ConversationPageModule {}
