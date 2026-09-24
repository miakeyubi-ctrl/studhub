import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { GuestReminderComponent } from './guest-reminder.component';

@NgModule({
  declarations: [GuestReminderComponent],
  imports: [CommonModule, IonicModule, TranslateModule, RouterModule],
  exports: [GuestReminderComponent]
})
export class GuestReminderModule {}
