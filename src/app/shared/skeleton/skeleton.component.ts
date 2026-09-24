import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-skeleton',
  templateUrl: './skeleton.component.html',
  styleUrls: ['./skeleton.component.scss'],
  standalone: false
})
export class SkeletonComponent {

  @Input() width = '100%';
  @Input() height = '100%';
  @Input() radius = '1rem';
  @Input() logoSize = '2rem';
  @Input() circle = false;
  @Input() showLogo = true;

}
