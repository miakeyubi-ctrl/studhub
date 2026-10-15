import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { PhotoGalleryComponent } from './photo-gallery.component';

@NgModule({
  imports: [CommonModule, IonicModule, TranslateModule],
  declarations: [PhotoGalleryComponent],
  exports: [PhotoGalleryComponent],
})
export class PhotoGalleryModule {}
