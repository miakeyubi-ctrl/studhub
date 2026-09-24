import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';

export type AppLanguage = 'fr' | 'en' | 'ar' | 'ar-TN';

export interface LanguageOption {
  code: AppLanguage;
  labelKey: string;
  rtl: boolean;
}

export const DEFAULT_LANGUAGE: AppLanguage = 'fr';

const STORAGE_KEY = 'studhub-language';

@Injectable({ providedIn: 'root' })
export class LanguageService {

  readonly languages: LanguageOption[] = [
    { code: 'fr', labelKey: 'LANGUAGE.fr', rtl: false },
    { code: 'en', labelKey: 'LANGUAGE.en', rtl: false },
    { code: 'ar', labelKey: 'LANGUAGE.ar', rtl: true },
    { code: 'ar-TN', labelKey: 'LANGUAGE.ar-TN', rtl: true }
  ];

  private languageSubject = new BehaviorSubject<AppLanguage>(DEFAULT_LANGUAGE);
  language$ = this.languageSubject.asObservable();

  constructor(private translate: TranslateService) {
    this.translate.addLangs(this.languages.map(l => l.code));
    this.translate.setDefaultLang(DEFAULT_LANGUAGE);
  }

  get currentLanguage(): AppLanguage {
    return this.languageSubject.value;
  }

  get isRtl(): boolean {
    return this.languages.find(l => l.code === this.currentLanguage)?.rtl ?? false;
  }

  init(): void {
    const saved = localStorage.getItem(STORAGE_KEY) as AppLanguage | null;
    const lang = saved && this.languages.some(l => l.code === saved) ? saved : DEFAULT_LANGUAGE;
    this.setLanguage(lang);
  }

  setLanguage(lang: AppLanguage): void {
    this.translate.use(lang);
    localStorage.setItem(STORAGE_KEY, lang);
    this.languageSubject.next(lang);
    this.applyDirection(lang);
  }

  private applyDirection(lang: AppLanguage): void {
    const isRtl = this.languages.find(l => l.code === lang)?.rtl ?? false;
    document.documentElement.setAttribute('dir', isRtl ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.classList.toggle('rtl', isRtl);
  }
}
