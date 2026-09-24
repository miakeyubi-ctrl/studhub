import { Component } from '@angular/core';
import { ThemeService } from './services/theme.service';
import { LanguageService } from './services/language.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  constructor(private themeService: ThemeService, private languageService: LanguageService) {
    this.languageService.init();
  }
}
